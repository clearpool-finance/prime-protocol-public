import { ethers, type providers } from 'ethers'
import { Instance } from './types'
import { getProviderNetwork } from './helpers'
import * as pool from './pool'
import * as prime from './prime'
import * as faucet from './faucet'
import * as constants from './constants'
import MultiCall from '@indexed-finance/multicall'

function createInstance(provider: any, currentChain: number): Instance {
  if (!provider) {
    throw 'Missing provider'
  }

  let _provider: providers.JsonRpcSigner | providers.JsonRpcProvider
  if (typeof provider === 'object') {
    _provider = new ethers.providers.Web3Provider(provider, 'any').getSigner()
  } else {
    _provider = new ethers.providers.JsonRpcProvider(provider, 'any')
  }

  let multicall = new MultiCall(_provider)
  let addresses = constants.config.address[currentChain]
  const instance: Instance = {
    _provider: _provider,
    multicall,
    ...pool,
    ...prime,
    ...faucet,
    addresses,
  }

  instance._networkPromise = getProviderNetwork(_provider).then((network) => {
    delete instance._networkPromise
    instance._network = network
    instance.addresses = constants.config.address[network.id]
  })
  return instance
}

const Prime = {
  createInstance: createInstance,
  constants,
  multical: MultiCall,
  supportedChains: constants.config.supportedChains,
}

export * from './types'
export default Prime

module.exports = Prime
