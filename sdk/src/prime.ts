import { BigNumber } from 'ethers'
import type { Prime } from '../protocol/typechain-types'
import { bindNetId, initContract, isAddress } from './helpers'
import { config } from './constants'

export async function getStableCoins(): Promise<string[]> {
  await bindNetId(this)
  isAddress(this.addresses.Prime)
  return initContract<Prime>(
    this.addresses.Prime,
    config.abi.Prime,
    this._provider,
  ).availableAssets()
}

export async function getOriginationRate(): Promise<BigNumber> {
  await bindNetId(this)
  isAddress(this.addresses.Prime)
  return initContract<Prime>(
    this.addresses.Prime,
    config.abi.Prime,
    this._provider,
  ).originationRate()
}

export async function getRollOriginationRate(): Promise<BigNumber> {
  await bindNetId(this)
  isAddress(this.addresses.Prime)
  return initContract<Prime>(
    this.addresses.Prime,
    config.abi.Prime,
    this._provider,
  ).incrementPerRoll()
}

export async function getSpreadRate(): Promise<BigNumber> {
  await bindNetId(this)
  isAddress(this.addresses.Prime)
  return initContract<Prime>(this.addresses.Prime, config.abi.Prime, this._provider).spreadRate()
}

export interface PrimeI {
  getStableCoins(): Promise<string[]>
  getOriginationRate(): Promise<BigNumber>
  getRollOriginationRate(): Promise<BigNumber>
  getSpreadRate(): Promise<BigNumber>
}
