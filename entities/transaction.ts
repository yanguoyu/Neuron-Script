import {
  Entity,
  BaseEntity,
  PrimaryColumn,
  Column,
  OneToMany,
} from 'typeorm'
import { CellDep } from '@ckb-lumos/lumos'
import InputEntity from './input'
import OutputEntity from './output'
import { TransactionStatus } from '../types'

@Entity()
export default class Transaction extends BaseEntity {
  @PrimaryColumn({
    type: 'varchar'
  })
  hash!: string

  @Column({
    type: 'varchar'
  })
  version!: string

  @Column({
    type: 'simple-json'
  })
  cellDeps: CellDep[] = []

  @Column({
    type: 'simple-json'
  })
  headerDeps: string[] = []

  @Column({
    type: 'simple-json'
  })
  witnesses!: string[]

  @Column({
    type: 'varchar',
    nullable: true
  })
  timestamp: string | undefined = undefined

  @Column({
    type: 'varchar',
    nullable: true
  })
  blockNumber: string | undefined = undefined

  @Column({
    type: 'varchar',
    nullable: true
  })
  blockHash: string | undefined = undefined

  @Column({
    type: 'varchar',
    nullable: true
  })
  description?: string

  @Column({
    type: 'varchar'
  })
  status!: TransactionStatus

  @Column({
    type: 'varchar'
  })
  createdAt!: string

  @Column({
    type: 'varchar'
  })
  updatedAt!: string

  // only used for check fork in indexer mode
  @Column({
    type: 'boolean'
  })
  confirmed: boolean = false

  @OneToMany(
    _type => InputEntity,
    input => input.transaction
  )
  inputs!: InputEntity[]

  @OneToMany(
    _type => OutputEntity,
    output => output.transaction
  )
  outputs!: OutputEntity[]
}
