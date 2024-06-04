import { ethers, deployments, network } from 'hardhat'
import { config } from './helpers/config'

async function main() {
  const governor = (config.governor as Record<string, string>)[network.name];

  if (!governor) {
    console.log('Missing governor address')
    return
  }

  let { address: primeContract } = await deployments.get('Prime')
  let { address: poolContract } = await deployments.get('PoolBeacon')
  let { address: factoryContract } = await deployments.get('PoolFactory')
  let { address: adminContract } = await deployments.get('DefaultProxyAdmin')

  let Prime = await ethers.getContractAt('Prime', primeContract)
  let tx = await Prime.transferOwnership(governor)
  await tx.wait()

  let pool = await ethers.getContractAt('UpgradeableBeacon', poolContract)
  let orderTx = await pool.transferOwnership(governor)
  await orderTx.wait()

  let factory = await ethers.getContractAt('PoolFactory', factoryContract)
  let factoryTx = await factory.transferOwnership(governor)
  await factoryTx.wait()

  let admin = await ethers.getContractAt('ProxyAdmin', adminContract)
  let adminTx = await admin.transferOwnership(governor)
  await adminTx.wait()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
