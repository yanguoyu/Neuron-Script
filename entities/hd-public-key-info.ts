import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn } from 'typeorm'
import { AddressType } from '../types'

@Entity()
export default class HdPublicKeyInfo {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({
    type: 'varchar'
  })
  @Index()
  walletId!: string

  @Column()
  addressType!: AddressType

  @Column()
  @Index()
  addressIndex!: number

  @Column({
    type: 'varchar'
  })
  publicKeyInBlake160!: string

  @CreateDateColumn({
    type: 'varchar',
    default: () => 'CURRENT_TIMESTAMP'
  })
  createdAt!: Date
}
