import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const deployFunction: DeployFunction = async function ({
  deployments: { deploy },
  getNamedAccounts,
  network,
  run,
}: HardhatRuntimeEnvironment) {
  let namePrefix = ''
  let symbolPrefix = ''

  switch (network.name) {
    case 'goerli': {
      namePrefix = 'Goerli'
      symbolPrefix = 'G-'
      break
    }
    case 'sepolia': {
      namePrefix = 'Sepolia'
      symbolPrefix = 'S-'
      break
    }
    case 'polygonMumbai': {
      namePrefix = 'Mumbai'
      symbolPrefix = 'PM-'
      break
    }
    case 'baseSepolia': {
      namePrefix = 'Base'
      symbolPrefix = 'BS-'
      break
    }
    case 'localhost':
    case 'hardhat': {
      namePrefix = 'Hardhat'
      symbolPrefix = 'H-'
      break
    }

    default: {
      throw new Error('This script is not meant to be run on mainnet')
    }
  }

  const tokens = [
    {
      name: `Clearpool ${namePrefix} USDC`,
      symbol: `${symbolPrefix}USDC`,
      rawName: 'USDC',
      decimals: 6,
    },
    {
      name: `Clearpool ${namePrefix} USDT`,
      symbol: `${symbolPrefix}USDT`,
      rawName: 'USDT',
      decimals: 6,
    },
    {
      name: `Clearpool ${namePrefix} DAI`,
      symbol: `${symbolPrefix}DAI`,
      rawName: 'DAI',
      decimals: 18,
    },
  ]

  const { deployer } = await getNamedAccounts()

  for (const token of tokens) {
    await deploy(token.rawName, {
      contract: 'StableCoin',
      from: deployer,
      args: [token.name, token.symbol, token.decimals],
      log: true,
    })
  }

  if (network.config.verify) {
    await run('etherscan-verify')
  }
}

export default deployFunction

deployFunction.dependencies = []

deployFunction.tags = ['StableCoins']
