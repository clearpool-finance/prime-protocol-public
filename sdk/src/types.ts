import { JsonRpcSigner, JsonRpcProvider } from '@ethersproject/providers'
import { Network } from '@ethersproject/networks'
import { PoolI } from './pool'
import { PrimeI } from './prime'
import { FaucetInterface } from './faucet'
import type { MultiCall } from '@indexed-finance/multicall'
export interface Instance extends PoolI, PrimeI, FaucetInterface {
  _provider: JsonRpcSigner | JsonRpcProvider
  _networkPromise?: Promise<any>
  _network?: Network
  addresses: Record<string, any>
  multicall: MultiCall
}

export type { MultiCall }

export type StableCoin = {
  address: string
  symbol: string
  decimals: number
  logoUrl: string
}