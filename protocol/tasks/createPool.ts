import { task } from 'hardhat/config'
import { IPool } from '../typechain-types'
import { types } from 'hardhat/config'

const day = 24 * 60 * 60
/**
 * Usage example:
 * npx hardhat createPool --network polygonMumbai --isbulletloan false --asset 0x629F6216ca42d7ff7dd7c340d1B359dA9e0688f5 --ratemantissa 15 --size 100000
 */
task('createPool', 'Create a new pool')
  .addOptionalParam(
    'isbulletloan',
    'true in case of bullet loan, false otherwise',
    false,
    types.boolean,
  )
  .addParam('asset', 'base asset address', '', types.string)
  .addParam('ratemantissa', 'rateMantissa from 0 to 100, 100% as default', 100, types.int)
  .addParam('size', 'size of the pool from 0 to N * 10^18, 1 * 10^18 as default', 1, types.int)
  .addParam('tenor', 'tenor, default is 100 days', 100 * day, types.int)
  .addParam('depositwindow', 'deposit window, default is 30 days', 30 * day, types.int)
  .addOptionalParam('members', 'string array of addresses separated by comma')
  .setAction(async function (
    { members, asset, size, tenor, ratemantissa, depositwindow, isbulletloan },
    { ethers: { getContractAt, BigNumber, utils }, deployments: { get } },
  ) {
    const Factory = await getContractAt('PoolFactory', (await get('PoolFactory')).address)

    const encodeAddressArray = (addresses: string[]): string => {
      let hex = '0x'
      hex += addresses.map((address) => address.substring(2, 42)).join('')
      return utils.hexlify(hex)
    }

    const PoolDataStruct = {
      isBulletLoan: isbulletloan as boolean,
      asset: String(asset),
      size: BigNumber.from(size).mul(utils.parseEther('1')),
      tenor: BigNumber.from(tenor),
      rateMantissa: BigNumber.from(ratemantissa).mul(utils.parseEther('0.01')),
      depositWindow: BigNumber.from(depositwindow),
    } as IPool.PoolDataStruct

    await Factory.createPool(
      PoolDataStruct,
      members ? utils.arrayify(encodeAddressArray([members.split(',')])) : [],
    )
  })
