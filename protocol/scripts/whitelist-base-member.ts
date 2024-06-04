import { ethers, deployments } from 'hardhat'
import { config } from './helpers/config'

async function main() {
  const { address: primeContract } = await deployments.get('Prime')
  const Prime = await ethers.getContractAt('Prime', primeContract)

  Object.entries(config.baseMembers).forEach(async ([k, v]) => {
    if (!ethers.utils.isAddress(v)) {
      throw new Error('Address %s is not a valid address'.replace('%s', v))
    } else {
      const isWhitelisted = await Prime.isMember(v)

      if (!isWhitelisted) {
        if (k !== 'lender2') {
          await Prime.whitelistMember(v, ethers.BigNumber.from('60'))
          console.log('Whitelisted member %s'.replace('%s', v))
        }
      } else {
        console.log('Member %s is already whitelisted'.replace('%s', v))
      }
    }
  })
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
