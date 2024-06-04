import * as dotenv from 'dotenv'
import { HardhatUserConfig } from 'hardhat/config'

import '@nomicfoundation/hardhat-toolbox'
import 'hardhat-contract-sizer'
import 'hardhat-docgen'
import 'hardhat-deploy'
import '@openzeppelin/hardhat-upgrades'
import 'hardhat-dependency-compiler'

import './tasks'

dotenv.config()

const networkConfig = (chainId: number, url: string | null | undefined, accounts: any[], verifyKey?: string, apiUrl?: string) => ({
  url: url || '',
  chainId: chainId,
  accounts: accounts,
  verify: {
    etherscan: {
      apiUrl: apiUrl ?? undefined,
      apiKey: verifyKey ?? '',
    },
  },
})

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      saveDeployments: true
    },
    mainnet: networkConfig(
      1,
      `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      process.env.DEPLOYER_MAINNET !== undefined ? [process.env.DEPLOYER_MAINNET] : [],
      process.env.ETHSCAN_API_KEY,
    ),
    sepolia: networkConfig(
      11155111,
      `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      process.env.DEPLOYER !== undefined ? [process.env.DEPLOYER] : [],
      process.env.ETHSCAN_API_KEY,
      "https://api-sepolia.etherscan.io"
    ),
    polygon: networkConfig(
      137,
      'https://polygon-rpc.com',
      process.env.DEPLOYER !== undefined ? [process.env.DEPLOYER] : [],
      process.env.POLYGONSCAN_API_KEY
    ),
    polygonMumbai: networkConfig(
      80001,
      'https://matic-mumbai.chainstacklabs.com',
      process.env.DEPLOYER !== undefined ? [process.env.DEPLOYER] : [],
      process.env.POLYGONSCAN_API_KEY,
    ),
    optimism: networkConfig(
      10,
      `https://optimism-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      process.env.DEPLOYER_MAINNET !== undefined ? [process.env.DEPLOYER_MAINNET] : [],
      process.env.OPTIMSCAN_API_KEY,
    ),
    base: networkConfig(
      8453,
      `https://mainnet.base.org`,
      process.env.DEPLOYER_MAINNET !== undefined ? [process.env.DEPLOYER_MAINNET] : [],
      process.env.BASESCAN_API_KEY,
      'https://api.basescan.org'
    ),
    baseSepolia: networkConfig(
      84532,
      `https://sepolia.base.org`,
      process.env.DEPLOYER !== undefined ? [process.env.DEPLOYER] : [],
      process.env.BASESCAN_API_KEY,
      'https://api-sepolia.basescan.org'
    ),
    avalanche: networkConfig(
      43114,
      'https://api.avax.network/ext/bc/C/rpc',
      process.env.DEPLOYER_MAINNET !== undefined ? [process.env.DEPLOYER_MAINNET] : [],
      'avalanche',
      'https://api.routescan.io/v2/network/mainnet/evm/43114/etherscan/api'
    )
  },
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  dependencyCompiler: {
    paths: [
      '@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol',
      '@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol'
    ],
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: false,
    strict: false,
  },
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: true,
  },
}

export default config
