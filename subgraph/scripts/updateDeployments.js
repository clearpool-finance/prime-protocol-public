const path = require('path')
const fs = require('fs')

const chains = {
  sepolia: 'sepolia',
  mainnet: 'mainnet',
  optimism: 'optimism',
  base: 'base',
  baseSepolia: 'baseSepolia',
  avalanche: 'avalanche',
}

const contractNames = ['Prime', 'PoolFactory']

const update = (chainName) => {
  const contracts = {}

  contractNames.forEach((contractName) => {
    try {
      const contractPath = path.resolve(`../protocol/deployments/${chainName}/${contractName}.json`)

      const deployment = JSON.parse(fs.readFileSync(contractPath, { encoding: 'utf8' }))

      const address = deployment.address
      const block = deployment?.receipt?.blockNumber

      contracts[contractName] = { address, block }
    } catch (error) {
      console.log(`Contract ${contractName} not found on ${chainName}`)
    }
  })

  const filePath = path.resolve(`./networks/${chains[chainName]}.json`)

  let network = JSON.parse(fs.readFileSync(filePath, { encoding: 'utf8' }))
  try {
    contractNames.forEach((contractName) => {
      network = Object.assign(network, {
        [contractName]: {
          address: contracts[contractName].address,
          startBlock: contracts[contractName].block || network[contractName].startBlock,
        },
      })
    })
  } catch (error) {
    console.log(`Network ${chainName} not found`)
  }

  fs.writeFileSync(filePath, JSON.stringify(network, null, 4), 'utf8')
}

update('sepolia')
update('mainnet')
update('optimism')
update('base')
update('baseSepolia')
update('avalanche')
