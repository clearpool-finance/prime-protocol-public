import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { ethers } from 'hardhat'

// Note: shouldn't be used until the deps are fixed
const deployFunction: DeployFunction = async function ({
  deployments: { deploy, get, getArtifact },
  getNamedAccounts,
  network,
  run,
}: HardhatRuntimeEnvironment) {
  const { deployer } = await getNamedAccounts()

  const newImplementation = await deploy('Pool', {
    from: deployer,
    args: [],
    log: true,
  })

  const { address: poolBeacon } = await get('PoolBeacon')

  const beacon = await ethers.getContractAt('UpgradeableBeacon', poolBeacon)
  console.log(await beacon.implementation())

  await beacon.upgradeTo(newImplementation.address)
  console.log(await beacon.implementation())

  if (network.config.verify) {
    await run('etherscan-verify')
  }
}

export default deployFunction

deployFunction.dependencies = []

deployFunction.tags = ['Pool-Upgrade']
