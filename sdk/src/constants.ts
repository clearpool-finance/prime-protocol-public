import { abi as PoolAbi } from '../protocol/artifacts/contracts/Pool/Pool.sol/Pool.json'
import { abi as PoolFactoryAbi } from '../protocol/artifacts/contracts/Pool/PoolFactory.sol/PoolFactory.json'
import { abi as ERC20Abi } from '../protocol/artifacts/contracts/mock/StableCoin.sol/StableCoin.json'
import { abi as PrimeAbi } from '../protocol/artifacts/contracts/PrimeMembership/Prime.sol/Prime.json'
import { abi as CoinKeeperAbi } from '../protocol/artifacts/contracts/mock/ICoinKeeper.sol/ICoinKeeper.json'
import { abi as MulticallAbi } from '../protocol/artifacts/contracts/mock/IMulticall3.sol/IMulticall3.json'
import { ethAddressLowerCase } from './helpers'
import type { Instance, StableCoin } from './types'

export const config = {
  abi: {
    Pool: PoolAbi,
    PoolFactory: PoolFactoryAbi,
    Prime: PrimeAbi,
    ERC20: ERC20Abi,
    CoinKeeper: CoinKeeperAbi,
    Multicall: MulticallAbi
  },
  supportedChains: [1, 11155111, 10, 8453, 84532, 43114],
  address: {
    1: {
      ETH: '0x0000000000000000000000000000000000000000',
      Prime: '0xE746cd792677F894ba1B8eCEBB84Bf006BA6A2D7',
      PoolFactory: '0x83D5c08eCfe3F711e1Ff34618c0Dcc5FeFBe1791',
      USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      CPOOL: '0x66761fa41377003622aee3c7675fc7b5c1c2fac5',
      CoinKeeper: '',
      Multicall: '0xcA11bde05977b3631167028862bE2a173976CA11'
    },
    11155111: {
      ETH: '0x0000000000000000000000000000000000000000',
      Prime: '0xfD7C85bBa66A627751a1EF37230e426D966eAdc4',
      PoolFactory: '0xf45235759EfFBE2aaE165996ccEdf4Fcb43B3850',
      USDT: '0x91fd3C5B736f880b0a3899b89E83b12d09729F4B',
      USDC: '0xEDf390a02d3caC16Ede393AD2B423B3022763260',
      DAI: '0x5073603f57519D2AdB631E765fBB58c51513cF3D',
      CPOOL: '0xEcfd527e404A0611bd21cd84e50fA62dD4Ba0E97',
      CoinKeeper: '0xA91ac11A4233A541D88BcB0602869aa4976C60be',
      Multicall: '0xcA11bde05977b3631167028862bE2a173976CA11'
    },
    10: {
      ETH: '0x0000000000000000000000000000000000000000',
      Prime: '0xC31761D26C856F6d2f31D0aCafBb1327f5Ec16de',
      PoolFactory: '0xe3E26D4187f3A8e100223576a37d30f2A89eb755',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      CPOOL: '0xc3630b805F10E91c2de084Ac26C66bCD91F3D3fE',
      CoinKeeper: '',
      Multicall: '0xcA11bde05977b3631167028862bE2a173976CA11'
    },
    8453: {
      ETH: '0x0000000000000000000000000000000000000000',
      Prime: '0xb8A7E3Ac3010eF846e9cAC18895AA82D35b50865',
      PoolFactory: '0xBdf5575Ec1cC0a14Bd3e94648a2453fdC7B56943',
      USDT: '',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949a6f0c72e6c4a641f24049a917db0cb',
      CPOOL: '',
      CoinKeeper: '',
      Multicall: '0xcA11bde05977b3631167028862bE2a173976CA11'
    },
    84532: {
      ETH: '0x0000000000000000000000000000000000000000',
      Prime: '0x15795aadca3759d7b356DecE036c285b1FBb32aa',
      PoolFactory: '0xF66F6D2DC713c994182d29DF711088d4a6bE5Ab5',
      USDT: '0xd2f34CD75FD00b51faddF1e9fDf97128976Da82C',
      USDC: '0x0765A218F2Edc70cf98A0Ef7Daae8F993459D10D',
      DAI: '0x32a94A87091979207BDdBf3b9e5E1D4dAb0c2375',
      CPOOL: '',
      CoinKeeper: '',
      Multicall: '0xcA11bde05977b3631167028862bE2a173976CA11'
    },
    43114: {
      ETH: '0x0000000000000000000000000000000000000000',
      Prime: '0xb4546c6e2c69BBF5F29EaEAB3De3768D5Bb009df',
      PoolFactory: '0x7A05280940A23749106D8Fb2cA4b10B9D1C89067',
      USDT: '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7',
      USDC: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
      DAI: '',
      CPOOL: '',
      CoinKeeper: '',
      Multicall: '0xcA11bde05977b3631167028862bE2a173976CA11'
    }
  },
  stablecoins: {
    DAI: {
      symbol: 'DAI',
      decimals: 18,
      logoUrl: '/images/logos/dai.svg',
    },
    USDC: {
      symbol: 'USDC',
      decimals: 6,
      logoUrl: '/images/logos/usdc.svg',
    },
    USDT: {
      symbol: 'USDT',
      decimals: 6,
      logoUrl: '/images/logos/usdt.svg',
    },
    CPOOL: {
      symbol: 'CPOOL',
      decimals: 18,
      logoUrl: '/images/logos/clearpool-circle.svg',
    },
    ETH: {
      symbol: 'ETH',
      decimals: 18,
      logoUrl: '/images/chains/ethereum.svg',
    },
    MATIC: {
      symbol: 'MATIC',
      decimals: 18,
      logoUrl: '/images/chains/polygon.svg',
    },
    AVAX: {
      symbol: 'AVAX',
      decimals: 18,
      logoUrl: '/images/chains/avalanche.svg',
    },
  },
}

export function coins(asset: string, network: number): StableCoin {
  if (!asset || !network) return null
  let coins = coinsList(network)
  return coins[asset.toLowerCase()]
}

export async function loadPrimeCoins(sdk: Instance, networkId: number): Promise<StableCoin[]> {
  let stableCoins: StableCoin[] = []

  try {
    const _coins = await sdk.getStableCoins()
    const list = coinsList(networkId)
    stableCoins = _coins.map((coin) => ({
      address: coin,
      symbol: list[ethAddressLowerCase(coin)].symbol,
      decimals: list[ethAddressLowerCase(coin)].decimals,
      logoUrl: list[ethAddressLowerCase(coin)].logoUrl,
    }))
  } catch (e) {
    console.error('failed to load stable coins', e)
  }
  return stableCoins
}

export function coinsList(network: number): Record<string, StableCoin> {
  let stablecoins: Record<string, any> = {}

  const addressByNetwork = config.address[network]
  Object.keys(config.stablecoins).forEach((coin) => {
    if (addressByNetwork && addressByNetwork[coin] && addressByNetwork[coin].length) {
      stablecoins = Object.assign(stablecoins, {
        [ethAddressLowerCase(addressByNetwork[coin])]: {
          ...config.stablecoins[coin],
          address: addressByNetwork[coin],
        },
      })
    }
  })
  return stablecoins
}

export function coinsForBalance(
  network: number,
  allowedTokens: string[],
): Record<string, StableCoin> {
  let coins = coinsList(network)
  let filtered = Object.entries(coins).filter(([_, v]) => allowedTokens.includes(v.symbol))
  return filtered.reduce((obj, [key, v]) => (obj[key] = v), {})
}
