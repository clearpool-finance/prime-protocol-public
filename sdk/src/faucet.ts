import { config } from './constants'
import { bindNetId, initContract, isAddress } from './helpers'
import { ContractTransaction } from 'ethers'
import type { Prime, ICoinKeeper } from '../protocol/typechain-types'

export async function whitelistMemberTestnet(address: string): Promise<ContractTransaction> {
  await bindNetId(this)

  isAddress(address)

  const primeAddr = this.addresses.Prime
  const contract = initContract<Prime>(primeAddr, config.abi.Prime, this._provider)

  return
  // TODO - uncomment whitelistMemberTestnet if we will have it in Prime contract
  // return contract.whitelistMemberTestnet(address)
}

export async function claimTokensTestnet(): Promise<ContractTransaction> {
  await bindNetId(this)

  const coinKeeperAddress = this.addresses.CoinKeeper

  const contract = initContract<ICoinKeeper>(
    coinKeeperAddress,
    config.abi.CoinKeeper,
    this._provider,
  )
  return contract.claimAll()
}

export interface FaucetInterface {
  whitelistMemberTestnet(address: string): Promise<ContractTransaction>
  claimTokensTestnet(): Promise<ContractTransaction>
}
