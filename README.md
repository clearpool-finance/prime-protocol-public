### How to add Prime members

1. Get the available `Prime` contract address from [config file](sdk/src/constants.ts)
2. Go to the [Chain explorer page](https://etherscan.io/address/{primeContractAddress})
3. Connect with the Governor wallet via Metamask
4. Execute `whitelistMember` function with the following input
    ```
    _memberAddress: "0x0",
    // The number up to 100 representing member's score
    _riskScore: 1,
    ```
5. To be able to add this member as lender inside the Order the address should be added in the [constants file](https://github.com/clearpool-finance/clearpool.finance/blob/main/src/lib/utils/constants.ts) with the related information like (logoUrl, name)
