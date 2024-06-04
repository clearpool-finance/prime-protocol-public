import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const deployFunction: DeployFunction = async function ({
  deployments: { deploy, get },
  network,
  getNamedAccounts,
  run,
}: HardhatRuntimeEnvironment) {
  const { deployer } = await getNamedAccounts()
  const { address: primeContract } = await get('Prime')
  const { address: poolBeacon } = await get('PoolBeacon')

  await deploy('PoolFactory', {
    from: deployer,
    args: [],
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        init: {
          methodName: '__PoolFactory_init',
          args: [primeContract, poolBeacon],
        },
      },
    },
  })

  if (network.config.verify) {
    await run('etherscan-verify')
  }
}

export default deployFunction

deployFunction.dependencies = []

deployFunction.tags = ['Pool-Factory-Deploy']
