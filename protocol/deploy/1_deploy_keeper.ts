import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const deployFunction: DeployFunction = async function ({
  deployments: { deploy },
  getNamedAccounts,
  network,
  run,
}: HardhatRuntimeEnvironment) {
  let contractName: string = ''
  switch (network.name) {
    case 'polygonMumbai': {
      contractName = 'CoinKeeperMumbai'
      break
    }
    case 'goerli': {
      contractName = 'CoinKeeperGoerli'
      break
    }
    case 'sepolia': {
      contractName = 'CoinKeeperGoerli'
      break
    }
    case 'localhost':
    case 'hardhat': {
      contractName = 'CoinKeeperMumbai'
      break
    }
    default: {
      throw new Error('This script is not meant to be run on mainnet')
    }
  }

  const { deployer } = await getNamedAccounts()
  await deploy(contractName, {
    from: deployer,
    args: [],
    log: true,
  })

  if (network.config.verify) {
    await run('etherscan-verify')
  }
}

export default deployFunction

deployFunction.dependencies = []

deployFunction.tags = ['Keeper-Deploy']
