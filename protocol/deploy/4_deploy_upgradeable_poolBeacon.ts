import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const deployFunction: DeployFunction = async function ({
  deployments: { deploy },
  getNamedAccounts,
  network,
  run,
}: HardhatRuntimeEnvironment) {
  const { deployer } = await getNamedAccounts()

  const pool_implementation = await deploy('Pool', {
    from: deployer,
    args: [],
    log: true,
  })

  await deploy('PoolBeacon', {
    contract: 'UpgradeableBeacon',
    from: deployer,
    args: [pool_implementation.address],
    log: true,
  })

  if (network.config.verify) {
    await run('etherscan-verify')
  }
}

export default deployFunction

deployFunction.dependencies = []

deployFunction.tags = ['Pool-Beacon-Deploy']
