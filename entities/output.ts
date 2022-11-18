import { Entity, BaseEntity, Column, PrimaryColumn, ManyToOne } from 'typeorm'
import { Script, HashType, OutPoint } from '@ckb-lumos/lumos'
import TransactionEntity from './transaction'

@Entity()
export default class Output extends BaseEntity {
  @PrimaryColumn({
    type: 'varchar'
  })
  outPointTxHash!: string

  @PrimaryColumn({
    type: 'varchar'
  })
  outPointIndex!: string

  @Column({
    type: 'varchar'
  })
  capacity!: string

  @Column({
    type: 'varchar'
  })
  lockCodeHash!: string

  @Column({
    type: 'varchar'
  })
  lockArgs!: string

  @Column({
    type: 'varchar'
  })
  lockHashType!: HashType

  @Column({
    type: 'varchar'
  })
  lockHash!: string

  @Column({
    type: 'varchar'
  })
  status!: string

  @Column({
    type: 'varchar',
    nullable: true
  })
  typeCodeHash: string | null = null

  @Column({
    type: 'varchar',
    nullable: true
  })
  typeArgs: string | null = null

  @Column({
    type: 'varchar',
    nullable: true
  })
  typeHashType: HashType | null = null

  @Column({
    type: 'varchar',
    nullable: true
  })
  typeHash: string | null = null

  // only first 130 chars
  @Column({
    type: 'varchar',
    default: '0x'
  })
  data: string = '0x'

  @Column({
    type: 'varchar',
    nullable: true
  })
  daoData: string | null = null

  @Column({
    type: 'boolean'
  })
  hasData!: boolean

  @Column({
    type: 'varchar',
    nullable: true
  })
  depositTxHash: string | null = null

  @Column({
    type: 'varchar',
    nullable: true
  })
  depositIndex: string | null = null

  @Column({
    type: 'varchar',
    nullable: true
  })
  multiSignBlake160: string | null = null

  public outPoint(): OutPoint {
    return {
      txHash: this.outPointTxHash,
      index: this.outPointIndex
    }
  }

  public depositOutPoint(): OutPoint | undefined {
    if (this.depositTxHash && this.depositIndex) {
      return {
        txHash: this.depositTxHash,
        index: this.depositIndex
      }
    }
    return undefined
  }

  public lockScript(): Script {
    return {
      args: this.lockArgs,
      codeHash: this.lockCodeHash,
      hashType: this.lockHashType
    }
  }

  public typeScript(): Script | undefined {
    if (this.typeCodeHash && this.typeArgs && this.typeHashType) {
      return {
        args: this.typeArgs,
        codeHash: this.typeCodeHash,
        hashType: this.typeHashType
      }
    }
    return undefined
  }

  @ManyToOne(
    _type => TransactionEntity,
    transaction => transaction.outputs,
    { onDelete: 'CASCADE' }
  )
  transaction!: TransactionEntity
}
