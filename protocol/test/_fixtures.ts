import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { ethers, upgrades } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

import {
  init,
  deploy,
  constants,
  parseUnit,
  day,
  encodeAddressArray,
  send,
  year,
  one,
  call,
} from '../utils'
import { PoolFactory, Pool, Prime, IPool, StableCoin, TxProxy } from '../typechain-types'
import { BigNumber } from 'ethers'

async function oneMonthlyLend() {
  const { monthlyPoolDataProps, lender1, monthlyPool, stableCoin, borrower, root, ...rest } =
    await loadFixture(monthlyPoolFixture)

  const lendAmount = monthlyPoolDataProps.size

  const lendTime = await runLendRequest(lendAmount, monthlyPool, stableCoin, lender1)

  // clean borrower's balance
  await stableCoin
    .connect(borrower)
    .transfer(root.address, await stableCoin.balanceOf(borrower.address))

  return {
    monthlyPoolDataProps,
    lendAmount,
    lender1,
    borrower,
    root,
    stableCoin,
    monthlyPool,
    lendTime,
    ...rest,
  }
}

async function shortMonthlyPool() {
  const {
    monthlyPoolDataStruct,
    lender1,
    stableCoin,
    borrower,
    poolFactory,
    lender2,
    prime_instance,
    ...rest
  } = await loadFixture(monthlyPoolFixture)

  monthlyPoolDataStruct.isBulletLoan = false
  monthlyPoolDataStruct.tenor = BigNumber.from(day * 30 * 3 + 10) // 100 days
  monthlyPoolDataStruct.depositWindow = BigNumber.from(day * 10) // 10 days

  await poolFactory.connect(borrower).createPool(
    monthlyPoolDataStruct,
    ethers.utils.arrayify(encodeAddressArray([lender1.address, lender2.address])),
  )

  const pools = await poolFactory.getPools()

  const shortPool = (await ethers.getContractAt('Pool', pools[pools.length - 1], borrower)) as Pool

  return {
    monthlyPoolDataStruct,
    lender1,
    lender2,
    borrower,
    stableCoin,
    shortPool,
  }
}

async function monthlyPoolFixture(setFees: boolean = true, depositWindow: any = BigNumber.from(day)) {
  const { poolFactory, lender1, lender2, borrower, stableCoin, prime_instance, ...rest } =
    await loadFixture(deployPoolFactoryandBeacon)

  if (setFees) {
    await prime_instance.setOriginationRate(parseUnit('0.005')) // 0.5%
    await prime_instance.changeSpreadRate(parseUnit('0.1')) // 10%
    await prime_instance.setRollingIncrement(parseUnit('0.1')) // 10%
  }

  const monthlyPoolDataProps: ICreatePoolProps = {
    isBulletLoan: false,
    asset: stableCoin.address,
    size: parseUnit('10000000'), // 10 Million
    tenor: BigNumber.from(day * 30 * 12), // 1 year (360 days)
    rateMantissa: parseUnit('0.1'), // 10%
    depositWindow: depositWindow, // 1 day
    members: ethers.utils.arrayify(encodeAddressArray([lender1.address, lender2.address])),
  }

  const monthlyPoolDataStruct: IPool.PoolDataStruct = {
    isBulletLoan: monthlyPoolDataProps.isBulletLoan,
    asset: monthlyPoolDataProps.asset,
    size: monthlyPoolDataProps.size,
    tenor: monthlyPoolDataProps.tenor,
    rateMantissa: monthlyPoolDataProps.rateMantissa,
    depositWindow: monthlyPoolDataProps.depositWindow,
  }

  await prime_instance.whitelistMember(lender1.address, 100)
  await prime_instance.whitelistMember(lender2.address, 100)

  await poolFactory
    .connect(borrower)
    .createPool(monthlyPoolDataStruct, monthlyPoolDataProps.members)

  const monthlyPoolAddress = await poolFactory.pools(0)

  const monthlyPool = (await ethers.getContractAt('Pool', monthlyPoolAddress, borrower)) as Pool

  return {
    monthlyPoolDataProps,
    monthlyPoolDataStruct,
    poolFactory,
    lender1,
    lender2,
    borrower,
    stableCoin,
    prime_instance,
    monthlyPool,
    ...rest,
  }
}

async function twoLends() {
  const { pool, lender1, lender2, borrower, stableCoin, ...rest } = await loadFixture(createPool)

  const lendAmount = parseUnit('50')

  await runLendRequest(lendAmount, pool, stableCoin, lender1)
  await runLendRequest(lendAmount, pool, stableCoin, lender2)

  return {
    pool,
    lender1,
    lender2,
    borrower,
    stableCoin,
    lendAmount,
    ...rest,
  }
}

async function oneLend() {
  const { poolFactory, lender1, borrower, stableCoin, prime_instance, ...rest } = await loadFixture(
    deployPoolFactoryandBeacon,
  )

  await prime_instance.setOriginationRate(parseUnit('0.005')) // 0.5%
  await prime_instance.changeSpreadRate(parseUnit('0.1')) // 10%
  await prime_instance.setRollingIncrement(parseUnit('0.1')) // 10%

  const anotherPoolDataProps: ICreatePoolProps = {
    isBulletLoan: true,
    asset: stableCoin.address,
    size: parseUnit('10000000'), // 10 Million
    tenor: BigNumber.from(day * 30 * 12), // 1 year (360 days)
    rateMantissa: parseUnit('0.1'), // 10%
    depositWindow: BigNumber.from(day), // 1 day
    members: ethers.utils.arrayify(encodeAddressArray([lender1.address])),
  }

  const anotherPoolDataStruct: IPool.PoolDataStruct = {
    isBulletLoan: anotherPoolDataProps.isBulletLoan,
    asset: anotherPoolDataProps.asset,
    size: anotherPoolDataProps.size,
    tenor: anotherPoolDataProps.tenor,
    rateMantissa: anotherPoolDataProps.rateMantissa,
    depositWindow: anotherPoolDataProps.depositWindow,
  }

  await prime_instance.whitelistMember(lender1.address, 100)

  await poolFactory
    .connect(borrower)
    .createPool(anotherPoolDataStruct, anotherPoolDataProps.members)

  const anotherPoolAddress = await poolFactory.pools(0)

  const anotherPool = (await ethers.getContractAt('Pool', anotherPoolAddress, borrower)) as Pool

  await runLendRequest(anotherPoolDataProps.size, anotherPool, stableCoin, lender1)

  return {
    anotherPoolDataProps,
    poolFactory,
    lender1,
    borrower,
    stableCoin,
    prime_instance,
    anotherPool,
    ...rest,
  }
}

async function createLendData() {
  const { pool, repayAmount, currentTime, stableCoin, lender1, prime_instance } = await loadFixture(
    createLendRequest,
  )

  const newLendAmount = parseUnit('10')

  const matDate = await pool.maturityDate()
  const tenor = await pool.tenor()

  const finalTime = tenor.add(matDate).add(4 * day)
  const rateMantissa = await pool.rateMantissa()

  const interest1: BigNumber = repayAmount
    .mul(rateMantissa)
    .mul(matDate.sub(currentTime))
    .div(year)
    .div(one)

  await time.increase(day)
  const secondLendTime = await runLendRequest(newLendAmount, pool, stableCoin, lender1)

  const interest2: BigNumber = newLendAmount
    .mul(rateMantissa)
    .mul(matDate.sub(secondLendTime))
    .div(year)
    .div(one)

  const totalLoan = repayAmount.add(newLendAmount)
  const interestMaturity: BigNumber = totalLoan
    .mul(rateMantissa)
    .mul(finalTime.sub(matDate))
    .div(year)
    .div(one)

  // recalculate interest
  const penaltyRateMantissa = await pool.penaltyRate(finalTime.sub(matDate))
  const penalty = totalLoan.mul(penaltyRateMantissa).div(one)

  return {
    pool,
    repayAmount,
    currentTime,
    stableCoin,
    lender1,
    prime_instance,
    newLendAmount,
    matDate,
    tenor,
    finalTime,
    secondLendTime,
    rateMantissa,
    totalLoan,
    interest1,
    interest2,
    interestMaturity,
    penaltyRateMantissa,
    penalty
  }
}

async function createLendRequest() {
  const repayAmount = parseUnit('70') as BigNumber
  const { pool, lender1, borrower, stableCoin, ...rest } = await loadFixture(createPool)

  const currentTime = await runLendRequest(repayAmount, pool, stableCoin, lender1)

  // borrower used a part of the money
  let connectedStableCoin = stableCoin.connect(borrower)
  await connectedStableCoin.transfer(rest.lender2.address, repayAmount)

  return {
    pool,
    lender1,
    borrower,
    stableCoin,
    repayAmount,
    currentTime,
    connectedStableCoin,
    ...rest,
  }
}

async function runLendRequest(
  lendAmount: BigNumber,
  pool: Pool,
  stableCoin: StableCoin,
  signer: SignerWithAddress,
) {
  await stableCoin.mint(signer.address, lendAmount)
  await stableCoin.connect(signer).approve(pool.address, lendAmount)

  await pool.connect(signer).lend(lendAmount)
  return time.latest();
}

export interface ICreatePoolProps {
  isBulletLoan: boolean
  asset: string
  size: BigNumber
  tenor: BigNumber
  rateMantissa: BigNumber
  depositWindow: BigNumber
  members: Uint8Array
}

async function createPool(includeMembers: boolean = true) {
  const {
    root,
    borrower,
    createPoolValuesProps,
    createPoolDataProps,
    prime_instance,
    poolFactory,
    ...rest
  } = await deployPoolFactoryandBeacon()

  await prime_instance.connect(root).changeSpreadRate(parseUnit('0.1')) // 10%);

  if (includeMembers) {
    await prime_instance.whitelistMember(root.address, BigNumber.from('1'))
    await prime_instance.whitelistMember(rest.lender1.address, BigNumber.from('1'))
    await prime_instance.whitelistMember(rest.lender2.address, BigNumber.from('1'))
  } else {
    createPoolValuesProps.members = ethers.utils.arrayify([]);
  }
  await poolFactory.connect(borrower).createPool(createPoolDataProps, createPoolValuesProps.members)

  const originationRate = parseUnit('0.1') // 10%

  await prime_instance.setOriginationRate(originationRate)

  await poolFactory.connect(borrower).createPool(createPoolDataProps, [])

  const poolAddr = await poolFactory.pools(0)
  const emptyPoolAddr = await poolFactory.pools(1)

  const pool = await ethers.getContractAt('Pool', poolAddr)
  const emptyPool = await ethers.getContractAt('Pool', emptyPoolAddr)

  const connectedPool = pool.connect(borrower)
  const connectedEmptyPool = emptyPool.connect(borrower)

  return {
    root,
    borrower,
    prime_instance,
    poolFactory,
    createPoolValuesProps,
    createPoolDataProps,
    pool,
    connectedPool,
    emptyPool,
    connectedEmptyPool,
    originationRate,
    ...rest,
  }
}

async function createZeroFeesPool(includeMembers: boolean = true) {
  const {
    root,
    borrower,
    createPoolValuesProps,
    createPoolDataProps,
    prime_instance,
    poolFactory,
    ...rest
  } = await deployPoolFactoryandBeacon()

  if (includeMembers) {
    await prime_instance.whitelistMember(root.address, BigNumber.from('1'))
    await prime_instance.whitelistMember(rest.lender1.address, BigNumber.from('1'))
    await prime_instance.whitelistMember(rest.lender2.address, BigNumber.from('1'))
  } else {
    createPoolValuesProps.members = ethers.utils.arrayify([]);
  }
  await poolFactory.connect(borrower).createPool(createPoolDataProps, createPoolValuesProps.members)

  await poolFactory.connect(borrower).createPool(createPoolDataProps, [])

  const poolAddr = await poolFactory.pools(0)
  const emptyPoolAddr = await poolFactory.pools(1)

  const pool = await ethers.getContractAt('Pool', poolAddr)
  const emptyPool = await ethers.getContractAt('Pool', emptyPoolAddr)

  const connectedPool = pool.connect(borrower)
  const connectedEmptyPool = emptyPool.connect(borrower)

  return {
    root,
    borrower,
    prime_instance,
    poolFactory,
    createPoolValuesProps,
    createPoolDataProps,
    pool,
    connectedPool,
    emptyPool,
    connectedEmptyPool,
    ...rest,
  }
}

async function deployPoolFactoryandBeacon() {
  const { prime_instance, borrower, ...rest } = await loadFixture(deployPrimeContract)

  const PoolFactory_Factory = await ethers.getContractFactory('PoolFactory')
  const Pool_Factory = await ethers.getContractFactory('Pool')

  const Pool_beacon = (await upgrades.deployBeacon(Pool_Factory, {
    unsafeAllow: ['delegatecall'],
  })) as Pool

  const poolFactory = (await upgrades.deployProxy(
    PoolFactory_Factory,
    [prime_instance.address, Pool_beacon.address],
    // todo add "uups" ?
    { initializer: '__PoolFactory_init' },
  )) as PoolFactory

  const createPoolValuesProps: ICreatePoolProps = {
    isBulletLoan: true,
    asset: rest.stableCoin.address,
    size: parseUnit('100'),
    tenor: BigNumber.from(day * 10),
    rateMantissa: parseUnit('0.05'),
    depositWindow: BigNumber.from(day * 6),
    members: ethers.utils.arrayify(
      encodeAddressArray([rest.lender1.address, rest.lender2.address]),
    ),
  }

  const createPoolDataProps: IPool.PoolDataStruct = {
    isBulletLoan: true,
    asset: createPoolValuesProps.asset,
    size: createPoolValuesProps.size,
    tenor: createPoolValuesProps.tenor,
    rateMantissa: createPoolValuesProps.rateMantissa,
    depositWindow: createPoolValuesProps.depositWindow,
  }

  await prime_instance.whitelistMember(borrower.address, BigNumber.from('1'))

  return {
    prime_instance,
    Pool_beacon,
    poolFactory,
    createPoolValuesProps,
    createPoolDataProps,
    borrower,
    ...rest,
  }
}

async function deployPrimeContract() {
  let [root, lender1, lender2, lender3, borrower, treasuryAddr, lender4] = await ethers.getSigners()

  let stableCoin = await deployStableCoin('USDC', 'USDC')

  const penaltyRatePerYear = parseUnit('0.05')

  const Prime_Factory = await ethers.getContractFactory('Prime')
  let proxy = await upgrades.deployProxy(
    Prime_Factory,
    [
      [...constants.defaultAssets, stableCoin.address], // assets array
      treasuryAddr.address, // treasury address
      penaltyRatePerYear, // penalty rate per year
    ],
    { initializer: '__Prime_init' },
  )
  await proxy.deployed()

  let prime_instance = await init<Prime>('Prime', proxy.address)

  return {
    root,
    Prime_Factory,
    prime_instance,
    lender1,
    lender2,
    lender3,
    lender4,
    treasuryAddr,
    borrower,
    penaltyRatePerYear,
    stableCoin,
  }
}

async function deployStableCoin(name: string, symbol: string) {
  let prime_instance = await deploy<StableCoin>('StableCoin', [name, symbol, 18] as any)
  return prime_instance
}


async function getDelayedValue<T>(pool: Pool, method: string, args: any) {
  /// making a snapshot to calculate value
  const snapshot = (await ethers.provider.send('evm_snapshot', [])) as BigNumber
  await time.increase(3);
  const result = await call<T>(pool, method, args);
  await ethers.provider.send('evm_revert', [snapshot]);

  return result;
}

export {
  deployPoolFactoryandBeacon,
  deployStableCoin,
  deployPrimeContract,
  createPool,
  createZeroFeesPool,
  createLendRequest,
  createLendData,
  runLendRequest,
  twoLends,
  oneLend,
  oneMonthlyLend,
  monthlyPoolFixture,
  shortMonthlyPool,
  getDelayedValue
}
