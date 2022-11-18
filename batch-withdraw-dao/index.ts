import { DataSource } from 'typeorm'
import path from 'path'
import fs from 'fs'
import { config } from '@ckb-lumos/lumos'
import Comm from './comm'
import Input from '../entities/input'
import Output from '../entities/output'
import TransactionEntity from '../entities/transaction'
import HdPublicKeyInfo from '../entities/hd-public-key-info'
import { OutputStatus, TransactionStatus } from '../types'
import TransactionFee from '../models/transaction-fee'
import TransactionSize from '../models/transaction-size'
import Transaction from '../models/transaction'

async function initDataSource() {
  const genesisBlockHash = await Comm.getInstance().rpc.getBlockHash('0x0')
  const appDataSource = new DataSource({
    type: "sqlite",
    database: path.resolve(Comm.getInstance().userData, `cell-${genesisBlockHash}.sqlite`),
    logging: true,
    entities: [
      Input,
      Output,
      TransactionEntity,
      HdPublicKeyInfo
    ]
  })
  await appDataSource.initialize()
  console.log('init datasource success')
  return appDataSource
}

type ConfigKey = keyof (typeof config.predefined)
async function main() {
  const appDataSource = await initDataSource()
  if (process.env['prefix'] && config.predefined[process.env['prefix'] as ConfigKey]) {
    config.initializeConfig(config.predefined[process.env['prefix'] as ConfigKey])
  }
  const outputs = await appDataSource
    .getRepository(Output)
    .createQueryBuilder('output')
    .leftJoinAndSelect('output.transaction', 'tx')
    .where(
      `
      output.daoData IS NOT NULL AND
      (
        output.status = :liveStatus OR
        output.status = :sentStatus OR
        tx.status = :failedStatus OR
        (
          (
            output.status = :deadStatus OR
            output.status = :pendingStatus
          ) AND
          output.depositTxHash is not null
        )
      ) AND
      output.lockArgs in (
        SELECT publicKeyInBlake160
        FROM hd_public_key_info
        WHERE walletId = :walletId
      )`,
      {
        walletId: Comm.getInstance().walletId,
        liveStatus: OutputStatus.Live,
        sentStatus: OutputStatus.Sent,
        failedStatus: TransactionStatus.Failed,
        deadStatus: OutputStatus.Dead,
        pendingStatus: OutputStatus.Pending
      }
    )
    .orderBy(`CASE output.daoData WHEN '0x0000000000000000' THEN 1 ELSE 0 END`, 'ASC')
    .addOrderBy('tx.timestamp', 'ASC')
    .getMany()
  const withdrawCells = outputs
    .filter(v => !v.depositOutPoint() && v.status === 'live' && v.transaction.status === 'success')
    .slice(0, process.env['dao-length'] ? +(process.env['dao-length']) : undefined)
  const txOutputs: (
    CKBComponents.CellOutput & {
      daoData: string
      depositOutPoint: { txHash: string, index: string }
      data: string
    }
  )[] = withdrawCells.map(v => {
    const buf = Buffer.alloc(8)
    buf.writeBigUInt64LE(BigInt(v.transaction.blockNumber!))
    const daoData = `0x${buf.toString('hex')}`
    return {
      capacity: v.capacity,
      lock: {
        args: v.lockArgs,
        codeHash: v.lockCodeHash,
        hashType: v.lockHashType
      },
      type: {
        args: v.typeArgs!,
        codeHash: v.typeCodeHash!,
        hashType: v.typeHashType!
      },
      daoData,
      depositOutPoint: {
        txHash: v.outPointTxHash,
        index: v.outPointIndex
      },
      data: daoData
    }
  })
  const transaction: CKBComponents.RawTransaction = {
    version: '0',
    cellDeps: [
      {
        outPoint: {
          txHash: config.getConfig().SCRIPTS['SECP256K1_BLAKE160']?.TX_HASH!,
          index: config.getConfig().SCRIPTS['SECP256K1_BLAKE160']?.INDEX!,
        },
        depType: config.getConfig().SCRIPTS['SECP256K1_BLAKE160']?.DEP_TYPE!,
      },
      {
        outPoint: {
          txHash: config.getConfig().SCRIPTS['DAO']?.TX_HASH!,
          index: config.getConfig().SCRIPTS['DAO']?.INDEX!,
        },
        depType: config.getConfig().SCRIPTS['DAO']?.DEP_TYPE!,
      },
    ],
    headerDeps: withdrawCells.map(v => v.transaction.blockHash!),
    inputs: withdrawCells.map(v => ({
      previousOutput: {
        txHash: v.outPointTxHash,
        index: v.outPointIndex
      },
      capacity: v.capacity,
      lock: {
        args: v.lockArgs,
        codeHash: v.lockCodeHash,
        hashType: v.lockHashType
      },
      since: '0'
    })),
    outputs: txOutputs,
    outputsData: txOutputs.map(v => v.daoData),
    witnesses: []
  }
  const liveCells = await appDataSource
    .getRepository(Output)
    .createQueryBuilder('output')
    .where(
      `
      output.status IN (:...statuses) AND
      hasData = false AND
      typeHash is null AND
      output.lockArgs in (
        SELECT publicKeyInBlake160
        FROM hd_public_key_info
        WHERE walletId = :walletId
      ) AND
      output.lockCodeHash = :lockCodeHash AND
      output.lockHashType = :lockHashType
      `,
      {
        walletId: Comm.getInstance().walletId,
        lockCodeHash: config.getConfig().SCRIPTS.SECP256K1_BLAKE160?.CODE_HASH,
        lockHashType: config.getConfig().SCRIPTS.SECP256K1_BLAKE160?.HASH_TYPE,
        statuses: [OutputStatus.Live]
      }
    )
    .getMany()
  if (liveCells.length === 0) {
    throw new Error('可用余额不足，请充值或者等待未上链交易完成')
  }
  liveCells.sort((a, b) => {
    const result = BigInt(a.capacity) - BigInt(b.capacity)
    if (result > BigInt(0)) {
      return 1
    }
    if (result === BigInt(0)) {
      return 0
    }
    return -1
  })

  const inputs: {
    previousOutput: {
      txHash: string,
      index: string
    },
    capacity: string,
    lock: CKBComponents.Script,
    since: '0'
  }[] = []
  let inputCapacities: bigint = BigInt(0)
  const feeRateInt = BigInt('2000')
  let needFee = BigInt(0)
  const changeOutputFee: bigint = TransactionFee.fee(101 + 8, feeRateInt)
  let totalSize: number = TransactionSize.tx(Transaction.fromSDK(transaction))
  let leftCapacity: bigint = BigInt(0)
  liveCells.every(cell => {
    if (inputs.find(el => (
      el.lock.args === cell.lockArgs &&
      el.lock.codeHash === cell.lockCodeHash &&
      el.lock.hashType === cell.lockHashType
    ))) {
      totalSize += TransactionSize.emptyWitness()
    } else {
      totalSize += TransactionSize.secpLockWitness()
    }
    inputs.push({
      previousOutput: {
        txHash: cell.outPointTxHash,
        index: cell.outPointIndex
      },
      capacity: cell.capacity,
      lock: {
        args: cell.lockArgs,
        codeHash: cell.lockCodeHash,
        hashType: cell.lockHashType
      },
      since: '0'
    })
    inputCapacities += BigInt(cell.capacity)
    totalSize += TransactionSize.input()

    needFee = TransactionFee.fee(totalSize, feeRateInt)
    leftCapacity = inputCapacities - needFee
    if (leftCapacity === BigInt(0)) {
      return false
    } else if (leftCapacity - changeOutputFee >= BigInt(61 * 10 ** 8)) {
      needFee += changeOutputFee
      return false
    }
    return true
  })

  if (inputCapacities < needFee) {
    throw new Error('可用余额不足，请充值或者等待未上链交易完成')
  }
  transaction.inputs.push(...inputs)
  if (leftCapacity !== BigInt(0)) {
    transaction.outputs.push({
      capacity: (leftCapacity - changeOutputFee).toString(),
      lock: inputs[0].lock
    })
    transaction.outputsData.push('0x')
  }

  fs.writeFileSync('./tx.json', JSON.stringify({ transaction }, null, 2))
}

main()