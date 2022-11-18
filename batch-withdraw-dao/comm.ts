import os from 'os'
import path from 'path';
import { RPC } from "@ckb-lumos/rpc";
import * as dotenv from 'dotenv'

dotenv.config()

let defaultUserDataPath: string
switch (os.platform()) {
  case 'darwin':
    defaultUserDataPath = `${os.homedir()}/Library/Application Support`
    break;
  case 'linux':
    defaultUserDataPath = `${os.homedir()}/.config`
    break;
  case 'win32':
    defaultUserDataPath = `${process.env['%APPDATA%']}`
    break;
  default:
    break;
}

function getParams(): {
  userDataPath: string
  rpcUrl: string
  walletId: string
} {
  if (!process.env['wallet-id']) {
    throw new Error('wallet-id is need')
  }
  return {
    userDataPath: path.resolve(process.env['user-data'] || defaultUserDataPath, 'Neuron', process.env['is-dev'] ? 'dev' : '', 'cells'),
    rpcUrl: process.env['rpc']!,
    walletId: process.env['wallet-id']! // || '59df1f4b-8e8d-4b49-aa8c-5c61559932f0'
  }
}

export default class Comm {
  private constructor() {}

  static getInstance() {
    if (Comm._instance) return Comm._instance
    const params = getParams()
    Comm._instance = new Comm()
    Comm._instance._rpc = new RPC(params.rpcUrl)
    Comm._instance._userData = params.userDataPath
    Comm._instance._walletId = params.walletId
    return Comm._instance
  }

  private static _instance: Comm;

  private _rpc!: RPC

  public get rpc() : RPC {
    return this._rpc
  }

  private _userData!: string

  public get userData() : string {
    return this._userData
  }

  private _walletId!: string

  public get walletId() : string {
    return this._walletId
  }
  
}