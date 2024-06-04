import { task } from 'hardhat/config'

task('whitelistSelectedMembers', 'Validate upgrade ')
  .addParam('members', 'string array of addresses separated by comma')
  .setAction(async function (
    { members },
    { ethers: { getContractAt, BigNumber, utils }, deployments: { get } },
  ) {
    const primeMembers = members.split(',')

    if (!primeMembers && primeMembers.length === 0) {
      throw new Error('missing members')
    }

    primeMembers.forEach((element: string) => {
      if (!utils.isAddress(element)) {
        throw new Error('Address %s is not a valid address'.replace('%s', element))
      }
    })

    const { address } = await get('Prime')
    const Prime = await getContractAt('Prime', address)

    primeMembers.forEach(async (member: string) => {
      const isWhitelisted = await Prime.isMember(member)

      if (!isWhitelisted) {
        await Prime.whitelistMember(member, BigNumber.from('60'))
        console.log('Whitelisted member %s'.replace('%s', member))
      } else {
        console.log('Member %s is already whitelisted'.replace('%s', member))
      }
    })
  })
