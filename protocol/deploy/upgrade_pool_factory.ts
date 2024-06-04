import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

// Note: shouldn't be used until the deps are fixed
const deployFunction: DeployFunction = async function ({
  deployments: { deploy },
  network,
  getNamedAccounts,
  run,
}: HardhatRuntimeEnvironment) {
  const { deployer } = await getNamedAccounts()
  await deploy('PoolFactory', {
    from: deployer,
    args: [],
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
  })

  if (network.config.verify) {
    await run('etherscan-verify')
  }
}

export default deployFunction

deployFunction.dependencies = []

deployFunction.tags = ['Pool-Factory-Upgrade']
