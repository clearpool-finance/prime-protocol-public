import { deployments, ethers } from 'hardhat'

async function main() {
  const { address: primeContract } = await deployments.get('Prime')
  const { address: poolFactoryContract } = await deployments.get('PoolFactory')

  if (primeContract.length === 0 || poolFactoryContract.length === 0) {
    console.log('contract addresses missing')
    return
  }

  const pool = await ethers.getContractAt('PoolFactory', poolFactoryContract)
  await pool.setPrimeContract(primeContract)
  console.log('New prime contract address set to:', primeContract)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
