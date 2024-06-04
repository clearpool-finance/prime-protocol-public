module.exports = {
  skipFiles: [
    'mock/CoinKeeperGoerli.sol',
    'mock/CoinKeeperMumbai.sol',
    'mock/FaucetToken.sol',
    'mock/PoolHarness.sol',
    'mock/PoolFactoryHarness.sol',
    'mock/TxProxy.sol',
    'mock/StableCoin.sol',
    'mock/ICoinKeeper.sol',
    'mock/IMulticall3.sol',
    'utils/AddressCoder.sol',
  ],
  measureStatementCoverage: false,
  measureFunctionCoverage: false,
  measureModifierCoverage: false,
}
