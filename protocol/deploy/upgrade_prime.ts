import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const deployFunction: DeployFunction = async function ({
  getNamedAccounts,
  deployments: { deploy },
  network,
  run,
}: HardhatRuntimeEnvironment) {
  const { deployer } = await getNamedAccounts()
  await deploy('Prime', {
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

deployFunction.tags = ['Prime-Upgrade']
