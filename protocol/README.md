# Clearpool Prime Protocol

## Overview

Clearpool is a Decentralized Finance ecosystem incorporating the first-ever permissionless marketplace for unsecured institutional liquidity.

On Prime, Borrowers can launch pools with customized terms, while lenders are able to gain access to yield opportunities with high-quality institutional counterparties, all within a secure, compliant environment. Clearpool Prime is exclusively available on Polygon.

## Deploy

Deploy instructions are located in [DEPLOY.md](./DEPLOY.md) file.

## Manual testing

To manually test the protocol you need claim tokens using CoinKeeper contract:

1. add token via addTokenToList() function
1. mint token to somebody via mintTokenTo()
1. claim() for choosen token
1. popup contract balance and transfer token if it is not mintable
1. control ownership via transferOwnership() function
1. give allowance for CoinKeeper contract via approve() function, claim tokens via transferTokenFromTo()

CoinKeeper addresses:
| Network | Address |
| --- | ----------- |
| Goerli | [0x5dF9428f031b16d7679316496608eaeAe2DD870e](https://goerli.etherscan.io/address/0x5dF9428f031b16d7679316496608eaeAe2DD870e#writeContract) |
| Mumbai | [0x66D0B6462D522689ea1FDcD94Af8dDeD4c61F782](https://mumbai.polygonscan.com/address/0x66D0B6462D522689ea1FDcD94Af8dDeD4c61F782#writeContract)|

## Test token addresses

### Goerli

| Name | Address | Free to Mint |
| ----------- | ----------- | --- |
| Clearpool (CPOOL) | [0x04Fdb7c92e9fEd88DE4Be367bb866014DDb97db7]( http://goerli.etherscan.io/address/0x04Fdb7c92e9fEd88DE4Be367bb866014DDb97db7)| no |
| Clearpool Goerli USDC (G-USDC) | [0x9227Bb983e04655863BBE381490FdAFE9a2fE5E9](https://goerli.etherscan.io/address/0x9227Bb983e04655863BBE381490FdAFE9a2fE5E9#readContract) | yes |
| Clearpool Goerli USDT (G-USDT) | [0x8bE6F536691Bd285185dd2c920D3a708c0eBe062](https://goerli.etherscan.io/address/0x8bE6F536691Bd285185dd2c920D3a708c0eBe062#readContract)| yes |
| Clearpool Goerli DAI (G-DAI) |[0x6EC7882BAD02a1b2a38CBd76FE4Cd29059a000E8](https://goerli.etherscan.io/address/0x6ec7882bad02a1b2a38cbd76fe4cd29059a000e8#readContract)| yes |

### Mumbai

| Name | Address | Free to Mint |
| ----------- | ----------- | --- |
| Clearpool (CPOOL)| [0x79430f572c7d3fbced572082fb67b6038bf874fb](https://mumbai.polygonscan.com/address/0x79430f572c7d3fbced572082fb67b6038bf874fb)| no |
| USDT |[0x59EacD38b823706D9157AE78cAa8b072d5a54E78](https://mumbai.polygonscan.com/address/0x59EacD38b823706D9157AE78cAa8b072d5a54E78)| yes |
| USDC |[0xaE6d5186b4418edB13dfE54Bd2F673b710C7333b](https://mumbai.polygonscan.com/address/0xaE6d5186b4418edB13dfE54Bd2F673b710C7333b)| yes |
