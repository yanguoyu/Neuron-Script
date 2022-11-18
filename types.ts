
export enum OutputStatus {
  Sent = 'sent',
  Live = 'live',
  Pending = 'pending',
  Dead = 'dead',
  Failed = 'failed'
}

export enum TransactionStatus {
  Pending = 'pending',
  Success = 'success',
  Failed = 'failed'
}

export enum AddressType {
  Receiving = 0, // External chain
  Change = 1 // Internal chain
}