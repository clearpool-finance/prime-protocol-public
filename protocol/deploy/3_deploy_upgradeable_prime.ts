import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { config } from '../scripts/helpers/config'

const deployFunction: DeployFunction = async function ({
  deployments: { deploy, get },
  getNamedAccounts,
  network,
  ethers,
  run,
}: HardhatRuntimeEnvironment) {
  const { deployer } = await getNamedAccounts()
  let penaltyRatePerYear = (config.penaltyRate as any)[network.name]
  let treasury = (config.treasury as any)[network.name]

  let assets = []
  for (const token of Object.keys(config.stablecoins)) {
    try {
      const { address } = await get(token)
      assets.push(address)
    } catch (error) {
      console.log(`missing stablecoin's deployment:`, token)
    }
  }

  if (assets.length === 0 || !penaltyRatePerYear || !treasury) {
    console.log('missing variables', assets, penaltyRatePerYear, treasury)
    return
  }

  /// @dev convert percentage number to wei representation
  penaltyRatePerYear = ethers.utils.parseUnits(penaltyRatePerYear.toString(), 16)

  await deploy('Prime', {
    from: deployer,
    args: [],
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        init: {
          methodName: '__Prime_init',
          args: [assets, treasury, penaltyRatePerYear],
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

deployFunction.tags = ['Prime-Deploy']
