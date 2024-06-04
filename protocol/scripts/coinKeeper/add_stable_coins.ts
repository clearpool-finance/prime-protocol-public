import { network, deployments, ethers } from 'hardhat'
import { config } from '../helpers/config'

async function main() {
  if (network.name === 'mainnet') {
    throw new Error('This script is not meant to be run on mainnet')
  }

  let contractName: string = ''
  switch (network.name) {
    case 'polygonMumbai': {
      contractName = 'CoinKeeperMumbai'
      break
    }
    default: {
      contractName = 'CoinKeeperGoerli'
      break
    }
  }

  const { address: keeperAddress } = await deployments.get(contractName)
  const keeper = await ethers.getContractAt('ICoinKeeper', keeperAddress)

  let assets = []
  for (const token of Object.keys(config.stablecoins)) {
    const { address, args } = await deployments.get(token)
    assets.push(address)
  }

  for (const asset of assets) {
    const token = await ethers.getContractAt('IERC20Metadata', asset)
    const name = await token.name()
    const symbol = await token.symbol()

    await keeper.addTokenToList(asset, symbol, false)

    console.log('Added %s to the list'.replace('%s', name))
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
