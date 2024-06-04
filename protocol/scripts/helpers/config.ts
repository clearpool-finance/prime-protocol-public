let config = {
  stablecoins: {
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  },
  baseMembers: {
    borrower1: '0x2853a9B0FA625a7c7b4E67bcbe4c337BEAEf655B',
    borrower2: '0x7Bc71F32E6Abb6bE619B5e31565fef0006a8e31d',
    borrower3: '0x3beaab5e79e2588d575cfba48a74d59a9e94c4fa',
    lender1: '0x9160BBD07295b77BB168FF6295D66C74E575B5BE',
    lender2: '0x51472b2ba9cba9179E11a72FF0a8d10b8fdCD7E0',
    member1: '0x99d6635Ad4483C3281BA8099F0d13B91F29cCd6B',
    member2: '0xdafbA3975d8d55e138763125C0841a494Dc9F4C3',
    member3: '0x7Bc71F32E6Abb6bE619B5e31565fef0006a8e31d',
    deployer: '0xB3FFde53f0076295f2C183f13b4A07dE288Df61D',
  },
  governor: {
    mainnet: '0xe43420E1f83530AAf8ad94e6904FDbdc3556Da2B',
    polygon: '',
    optimism: '0x144Fe9807C92C64acc4BB8E3B8917723EFC0d557',
    sepolia: '0xe43420E1f83530AAf8ad94e6904FDbdc3556Da2B',
    base: '0xD7872d0D7FF3d228c4FE33d29bF3eab806A9a33C',
    baseSepolia: '0xe43420E1f83530AAf8ad94e6904FDbdc3556Da2B',
    avalanche: '0x6d026A81d50F45fE549f65Bd1A62E3E8CA5AEfC3',
  },
  treasury: {
    mainnet: '0x455011f2704c6E192b09d9CC1430299C70af3454',
    polygon: '0xDBB6fb1279d5592693695c150ed29a78eb62fA54',
    optimism: '0x70ad50958312814e7370A52BDa2b5DA797ab64Bc',
    sepolia: '0xe43420E1f83530AAf8ad94e6904FDbdc3556Da2B',
    base: '0x6d026A81d50F45fE549f65Bd1A62E3E8CA5AEfC3',
    baseSepolia: '0xe43420E1f83530AAf8ad94e6904FDbdc3556Da2B',
    avalanche: '0xe8D5AB73E8bA49f4a388AC04b6D4cbB045976915'
  },
  penaltyRate: {
    mainnet: 5,
    optimism: 5,
    polygon: 5,
    base: 5,
    baseSepolia: 5,
    avalanche: 5
  },
}

function checkForEmptyObjectValues(obj: Record<string, any>) {
  return Object.entries(obj).every(([_, v]) => String(v).length > 0)
}

function getFilteredValuesfromObject(
  obj: Record<string, any>,
  filterFn: ([k, v]: [string, any]) => boolean,
) {
  const asArray = Object.entries(obj)
  const filtered = asArray.filter(filterFn)
  const asObject = Object.fromEntries(filtered)
  return asObject
}

export { config, checkForEmptyObjectValues, getFilteredValuesfromObject }
