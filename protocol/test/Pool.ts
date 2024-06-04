import { loadFixture, time, mine } from '@nomicfoundation/hardhat-network-helpers'
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { BigNumber, BigNumberish } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

import {
  constants,
  day,
  year,
  encodeAddressArray,
  parseTime,
  parseUnit,
  one,
  call
} from '../utils'

import {
  getDelayedValue,
  createLendRequest,
  createPool,
  createZeroFeesPool,
  twoLends,
  oneLend,
  runLendRequest,
  oneMonthlyLend,
  monthlyPoolFixture,
  createLendData,
  shortMonthlyPool,
  deployPoolFactoryandBeacon
} from './_fixtures'

import { IPool, IPrime, Pool, StableCoin } from '../typechain-types'
import { pool } from '../typechain-types/contracts'

describe('Pool', function () {
  describe('Unit tests', function () {
    describe('Initialization', function () {
      it('Should be already initialized', async () => {
        const { pool, root, createPoolDataProps } = await loadFixture(createPool)

        await expect(
          pool.__Pool_init(
            root.address, // Factory address, but we can use any address
            0, // spread rate
            0, // origination rate
            0, // increment per roll
            0, // penalty rate per year
            createPoolDataProps, // rest pool data
            [], // members array
          ),
        ).to.be.revertedWith(constants.contractInitializedErr)
      })
      it('Should be initialized with correct values with members', async () => {
        const { pool, borrower, poolFactory, createPoolValuesProps, prime_instance, penaltyRatePerYear } =
          await loadFixture(createPool)

        expect(await pool.factory()).to.be.equal(poolFactory.address)

        expect(await pool.asset()).to.be.equal(createPoolValuesProps.asset)
        expect(await pool.isClosed()).to.be.false
        expect(await pool.borrower()).to.be.equal(borrower.address)
        expect(await pool.isPublic()).to.be.false
        expect(await pool.maxSize()).to.be.equal(createPoolValuesProps.size)

        expect(await pool.tenor()).to.be.equal(createPoolValuesProps.tenor)
        expect(await pool.rateMantissa()).to.be.equal(createPoolValuesProps.rateMantissa)
        expect(await pool.spreadRate()).to.be.equal(await prime_instance.spreadRate())
        expect(await pool.penaltyRatePerYear()).to.be.equal(penaltyRatePerYear)
        expect(await pool.depositWindow()).to.be.equal(createPoolValuesProps.depositWindow)
        expect(await pool.currentSize()).to.be.equal(0)
        expect(await pool.depositMaturity()).to.be.equal(0)
        expect(await pool.maturityDate()).to.be.equal(0)
        expect(await pool.activeRollId()).to.be.equal(0)
        expect(await pool.originationRate()).to.be.equal(0)
        expect(await pool.incrementPerRoll()).to.be.equal(0)
        expect(await pool.isBulletLoan()).to.eq(createPoolValuesProps.isBulletLoan)
        expect(await pool.YEAR()).to.eq(360 * day)
      })

      it('Should be initialized with correct values without members', async () => {
        let publicPool = () => createPool(false);
        const { pool, borrower, poolFactory, createPoolValuesProps, prime_instance, penaltyRatePerYear } =
          await loadFixture(publicPool)

        expect(await pool.factory()).to.be.equal(poolFactory.address)

        expect(await pool.asset()).to.be.equal(createPoolValuesProps.asset)
        expect(await pool.isClosed()).to.be.false
        expect(await pool.borrower()).to.be.equal(borrower.address)
        expect(await pool.isPublic()).to.be.true
        expect(await pool.maxSize()).to.be.equal(createPoolValuesProps.size)

        expect(await pool.tenor()).to.be.equal(createPoolValuesProps.tenor)
        expect(await pool.rateMantissa()).to.be.equal(createPoolValuesProps.rateMantissa)
        expect(await pool.spreadRate()).to.be.equal(await prime_instance.spreadRate())
        expect(await pool.penaltyRatePerYear()).to.be.equal(penaltyRatePerYear)
        expect(await pool.depositWindow()).to.be.equal(createPoolValuesProps.depositWindow)
        expect(await pool.currentSize()).to.be.equal(0)
        expect(await pool.depositMaturity()).to.be.equal(0)
        expect(await pool.maturityDate()).to.be.equal(0)
        expect(await pool.activeRollId()).to.be.equal(0)
        expect(await pool.originationRate()).to.be.equal(0)
        expect(await pool.isBulletLoan()).to.eq(createPoolValuesProps.isBulletLoan)
      })

      it('Should be initialized a montly pool with correct values with members', async () => {
        const { monthlyPool, borrower, poolFactory, monthlyPoolDataProps, prime_instance, penaltyRatePerYear } =
          await loadFixture(monthlyPoolFixture)

        expect(await monthlyPool.factory()).to.be.equal(poolFactory.address)

        expect(await monthlyPool.asset()).to.be.equal(monthlyPoolDataProps.asset)
        expect(await monthlyPool.isClosed()).to.be.false
        expect(await monthlyPool.borrower()).to.be.equal(borrower.address)
        expect(await monthlyPool.isPublic()).to.be.false
        expect(await monthlyPool.maxSize()).to.be.equal(monthlyPoolDataProps.size)

        expect(await monthlyPool.tenor()).to.be.equal(monthlyPoolDataProps.tenor)
        expect(await monthlyPool.rateMantissa()).to.be.equal(monthlyPoolDataProps.rateMantissa)
        expect(await monthlyPool.spreadRate()).to.be.equal(await prime_instance.spreadRate())
        expect(await monthlyPool.penaltyRatePerYear()).to.be.equal(penaltyRatePerYear)
        expect(await monthlyPool.depositWindow()).to.be.equal(monthlyPoolDataProps.depositWindow)
        expect(await monthlyPool.currentSize()).to.be.equal(0)
        expect(await monthlyPool.depositMaturity()).to.be.equal(0)
        expect(await monthlyPool.maturityDate()).to.be.equal(0)
        expect(await monthlyPool.activeRollId()).to.be.equal(0)
        expect(await monthlyPool.originationRate()).to.be.equal(parseUnit('0.005'))
        expect(await monthlyPool.isBulletLoan()).to.eq(monthlyPoolDataProps.isBulletLoan)
      })
    })
    describe('Pool creation', function () {
      it('Pool without members should be public', async () => {
        const { emptyPool } = await loadFixture(createPool)

        expect(await emptyPool.isPublic()).to.be.true
      })

      it('Pool with members should be private', async () => {
        const { pool } = await loadFixture(createPool)

        expect(await pool.isPublic()).to.be.false
      })
      it('Pool with penalty rate equal to 0 should not charge penalty', async () => {
        const { prime_instance, borrower, lender1, createPoolDataProps, poolFactory, stableCoin } =
          await loadFixture(createPool)

        const newPenalty = parseUnit('0')

        await prime_instance.updatePenaltyRatePerYear(newPenalty)

        await poolFactory.connect(borrower).createPool(createPoolDataProps, [])

        const allPools = await poolFactory.getPools()
        const poolAddr = allPools[allPools.length - 1]

        const pool = (await ethers.getContractAt('Pool', poolAddr, borrower)) as Pool

        await runLendRequest(parseUnit('100'), pool, stableCoin, lender1)

        const finishTime = (await pool.maturityDate()).add(await createPoolDataProps.tenor)

        await time.increaseTo(finishTime)

        expect(await pool.penaltyOf(lender1.address)).to.eq(0)
      })
    })
    describe('Pool closing', function () {
      it('Only borrower can close pool by close()', async () => {
        const { borrower, root, lender1, lender2, pool } = await loadFixture(createPool)

        expect(await pool.connect(borrower).isClosed()).to.be.false

        await expect(pool.connect(root).close()).to.be.revertedWith('NCR')
        await expect(pool.connect(lender1).close()).to.be.revertedWith('NCR')
        await expect(pool.connect(lender2).close()).to.be.revertedWith('NCR')
      })
      it('close() should be reverted if already closed', async () => {
        const { connectedPool } = await loadFixture(createPool)

        expect(await connectedPool.isClosed()).to.be.false

        await connectedPool.close()

        await expect(connectedPool.close()).to.be.revertedWith('OAC')
      })
      it('Should fail to close pool with debts', async () => {
        const { pool, lender1, borrower, stableCoin } = await loadFixture(createPool)

        await runLendRequest(parseUnit('70'), pool, stableCoin, lender1)

        let connectedPool = pool.connect(borrower)
        await expect(connectedPool.close()).to.be.revertedWith('OHD')
      })
      it('Should fail to close pool with active rolls', async () => {
        const { pool, borrower, lender1, stableCoin } = await loadFixture(createPool)

        await runLendRequest(parseUnit('70'), pool, stableCoin, lender1)

        let connectedBorrower = pool.connect(borrower)

        await timeToRoll(pool)

        await connectedBorrower.requestRoll()
        await pool.connect(lender1).acceptRoll()

        expect(connectedBorrower.close()).to.be.revertedWith('OHD')
      })

      it('should close the pool', async () => {
        const { borrower, pool } = await loadFixture(createPool)

        expect(await pool.isClosed()).to.be.false

        await expect(pool.connect(borrower).close()).to.emit(pool, "Closed");
        expect(await pool.isClosed()).to.be.true
      })
    })
    describe('whitelistLenders()', function () {
      it('Should fail to whitelist lenders triggered by non borrower', async () => {
        const { pool, lender2 } = await loadFixture(createPool)

        let members = ethers.utils.arrayify(encodeAddressArray([lender2.address]))

        await expect(pool.connect(lender2).whitelistLenders(members)).to.be.revertedWith('NCR')
        await expect(pool.whitelistLenders(members)).to.be.revertedWith('NCR')
      })


      it('Should fail to whitelist non prime member', async () => {
        const { connectedPool, lender3 } = await loadFixture(createPool)

        let members = ethers.utils.arrayify(encodeAddressArray([lender3.address]))

        await expect(connectedPool.whitelistLenders(members)).to.be.revertedWith('NPM')
      })

      it('Should fail to whitelist zero length lenders array', async () => {
        const { pool, borrower } = await loadFixture(createPool)

        let members = ethers.utils.arrayify(encodeAddressArray([]))

        await expect(pool.connect(borrower).whitelistLenders(members)).to.be.revertedWith('LLZ')
      })

      it('Should fail to whitelist lenders exceeding 60 limit size', async () => {
        const { connectedPool, lender2 } = await loadFixture(createPool)

        let members = ethers.utils.arrayify(cloneAddressArray(lender2.address, 61))

        await expect(connectedPool.whitelistLenders(members)).to.be.revertedWith('EAL')
      })

      it('Should fail to whitelist borrower itself', async () => {
        const { connectedPool, borrower, lender3, prime_instance } = await loadFixture(createPool)

        let members = ethers.utils.arrayify(encodeAddressArray([borrower.address]))

        await expect(connectedPool.whitelistLenders(members)).to.be.revertedWith('BLS')

        await prime_instance.whitelistMember(lender3.address, BigNumber.from('1'))

        members = ethers.utils.arrayify(encodeAddressArray([lender3.address, borrower.address]))

        await expect(connectedPool.whitelistLenders(members)).to.be.revertedWith('BLS')
      })

      it('Should whitelists lender', async () => {
        const { connectedPool, lender3, prime_instance } = await loadFixture(createPool)

        await prime_instance.whitelistMember(lender3.address, BigNumber.from('1'))
        let members = ethers.utils.arrayify(encodeAddressArray([lender3.address]))

        await expect(connectedPool.whitelistLenders(members))
          .to.emit(connectedPool, 'LenderWhitelisted')
          .withArgs(lender3.address)
      })

      it('Should whitelists lender after blacklist', async () => {
        const { connectedPool, lender3, prime_instance } = await loadFixture(createPool)

        await prime_instance.whitelistMember(lender3.address, BigNumber.from('1'))
        let members = ethers.utils.arrayify(encodeAddressArray([lender3.address]))

        // initial whitelist
        await connectedPool.whitelistLenders(members)
        await connectedPool.blacklistLenders(members)

        await expect(connectedPool.whitelistLenders(members))
          .to.emit(connectedPool, 'LenderWhitelisted')
          .withArgs(lender3.address)
      })

      it('Should whitelists and convert pool to private', async () => {
        let createPublicPool = () => createPool(false);
        const { connectedPool, lender3, prime_instance } = await loadFixture(createPublicPool)

        await prime_instance.whitelistMember(lender3.address, BigNumber.from('1'))
        let members = ethers.utils.arrayify(encodeAddressArray([lender3.address]))

        await expect(connectedPool.whitelistLenders(members))
          .to.emit(connectedPool, 'LenderWhitelisted')
          .withArgs(lender3.address)

        expect(await connectedPool.isPublic()).to.equal(false);
      })
    })

    describe('blacklistLenders()', function () {
      it('Should fail to blacklist lenders triggered by non borrower', async () => {
        const { pool, lender2 } = await loadFixture(createPool)

        let members = ethers.utils.arrayify(encodeAddressArray([lender2.address]))

        await expect(pool.blacklistLenders(members)).to.be.revertedWith('NCR')
      })

      it('Should fail to blacklist members into a non-private pool', async () => {
        const { emptyPool, borrower } = await loadFixture(createPool)

        let members = ethers.utils.arrayify(encodeAddressArray([]))

        await expect(emptyPool.connect(borrower).blacklistLenders(members)).to.be.revertedWith('OPP')
      })

      it('Should fail to blacklist zero length lenders array', async () => {
        const { pool, borrower } = await loadFixture(createPool)

        let members = ethers.utils.arrayify(encodeAddressArray([]))

        await expect(pool.connect(borrower).blacklistLenders(members)).to.be.revertedWith('LLZ')
      })

      it('Should fail to blacklist lenders exceeding 60 limit size', async () => {
        const { connectedPool, lender2 } = await loadFixture(createPool)

        let members = ethers.utils.arrayify(cloneAddressArray(lender2.address, 61))

        await expect(connectedPool.blacklistLenders(members)).to.be.revertedWith('EAL')
      })

      it('Should fail to blacklist non prime member', async () => {
        const { connectedPool, lender3 } = await loadFixture(createPool)

        let members = ethers.utils.arrayify(encodeAddressArray([lender3.address]))

        await expect(connectedPool.blacklistLenders(members)).to.be.revertedWith('NPM')
      })

      it('Should fail to blacklist non whitelisted lender', async () => {
        const { connectedPool, lender3, prime_instance } = await loadFixture(createPool)

        await prime_instance.whitelistMember(lender3.address, BigNumber.from('1'))

        let members = ethers.utils.arrayify(encodeAddressArray([lender3.address]))

        await expect(connectedPool.blacklistLenders(members)).to.be.revertedWith('IMB')
      })

      it('Should blacklists lender', async () => {
        const { connectedPool, lender1 } = await loadFixture(createPool)

        let members = ethers.utils.arrayify(encodeAddressArray([lender1.address]))

        await expect(connectedPool.blacklistLenders(members))
          .to.emit(connectedPool, 'LenderBlacklisted')
          .withArgs(lender1.address)
      })
    })

    describe('switchToPublic()', function () {
      it('Should fail to trigger function by non borrower', async () => {
        const { pool } = await loadFixture(createPool)

        await expect(pool.switchToPublic()).to.be.revertedWith('NCR')
      })

      it('Should fail execute switchToPublic if already is public', async () => {
        const { connectedPool } = await loadFixture(createPool)

        await connectedPool.switchToPublic()

        await expect(connectedPool.switchToPublic()).to.be.revertedWith('AAD')
      })

      it('Should execute switchToPublic', async () => {
        const { connectedPool } = await loadFixture(createPool)

        await expect(connectedPool.switchToPublic())
          .to.emit(connectedPool, 'ConvertedToPublic')
          .withArgs()

        expect(await connectedPool.isPublic()).to.be.equal(true);
      })
    })

    describe('requestCallBack()', function () {
      it('should fail to execute requestCallBack from non prime member', async () => {
        const { pool, lender3 } = await loadFixture(createPool)

        let connectedPool = pool.connect(lender3)
        await expect(connectedPool.requestCallBack()).to.be.revertedWith('NPM')
      })

      it('should fail to execute requestCallBack if pool closed', async () => {
        const { connectedPool, lender1 } = await loadFixture(createPool)

        await connectedPool.close()

        let connectedLender = connectedPool.connect(lender1)

        await expect(connectedLender.requestCallBack()).to.be.revertedWith('OAC')
      })

      it('should fail to execute requestCallBack if pool defaulted', async () => {
        const { connectedPool, lender1, root, poolFactory } = await loadFixture(createPool)

        await poolFactory.defaultPools([connectedPool.address]);

        let connectedLender = connectedPool.connect(lender1)

        await expect(connectedLender.requestCallBack()).to.be.revertedWith('PDD')
      })

      it('should fail to execute requestCallBack if no liquidity available', async () => {
        const { connectedPool, lender1 } = await loadFixture(createPool)

        let connectedLender = connectedPool.connect(lender1)

        await expect(connectedLender.requestCallBack()).to.be.revertedWith('LZL')
      })

      it('should fail to execute requestCallBack if no principal is available', async () => {
        const { connectedPool, lender1, borrower, prime_instance, lender3, stableCoin } =
          await loadFixture(createPool)

        await runLendRequest(parseUnit('10'), connectedPool, stableCoin, lender1)

        await prime_instance.whitelistMember(lender3.address, BigNumber.from('1'))

        let connectedBorrower = connectedPool.connect(borrower)
        await connectedBorrower.whitelistLenders(
          ethers.utils.arrayify(encodeAddressArray([lender3.address])),
        )

        let connectedLender = connectedPool.connect(lender3)

        await expect(connectedLender.requestCallBack()).to.be.revertedWith('LZL')
      })

      it('should fail to execute requestCallBack if tenor period expires', async () => {
        const { connectedPool, lender1, stableCoin, createPoolValuesProps } = await loadFixture(
          createPool,
        )

        await runLendRequest(parseUnit('10'), connectedPool, stableCoin, lender1)

        let connectedLender = connectedPool.connect(lender1)

        await time.increase(createPoolValuesProps.tenor)

        await expect(connectedLender.requestCallBack()).to.be.revertedWith('EMD')
      })

      it('should execute requestCallback', async () => {
        const { connectedPool, lender1, stableCoin } = await loadFixture(createPool)

        await runLendRequest(parseUnit('10'), connectedPool, stableCoin, lender1)

        let connectedLender = connectedPool.connect(lender1)

        await expect(connectedLender.requestCallBack())
          .to.emit(connectedPool, 'CallbackCreated')
          .withArgs(lender1.address)
      })

      it('should fail to execute requestCallBack if already have one', async () => {
        const { connectedPool, lender1, stableCoin } = await loadFixture(createPool)

        await runLendRequest(parseUnit('10'), connectedPool, stableCoin, lender1)

        let connectedLender = connectedPool.connect(lender1)

        await connectedLender.requestCallBack()

        await expect(connectedLender.requestCallBack()).to.be.revertedWith('AAD')
      })
    })

    describe('cancelCallBack()', function () {
      it('should fail to execute cancelCallBack from non prime member', async () => {
        const { pool, lender3 } = await loadFixture(createPool)

        let connectedLender = pool.connect(lender3)
        await expect(connectedLender.cancelCallBack()).to.be.revertedWith('NPM')
      })

      it('should fail to execute cancelCallBack is pool is closed', async () => {
        const { pool, lender1, borrower } = await loadFixture(createPool)

        await pool.connect(borrower).close();
        let connectedLender = pool.connect(lender1)
        await expect(connectedLender.cancelCallBack()).to.be.revertedWith('OAC')
      })

      it('should fail to execute cancelCallBack is pool is default', async () => {
        const { pool, lender1, poolFactory } = await loadFixture(createPool)

        await poolFactory.defaultPools([pool.address]);
        let connectedLender = pool.connect(lender1)
        await expect(connectedLender.cancelCallBack()).to.be.revertedWith('PDD')
      })

      it('should execute cancelCallBack', async () => {
        const { connectedPool, lender1, stableCoin } = await loadFixture(createPool)

        await runLendRequest(parseUnit('10'), connectedPool, stableCoin, lender1)

        let connectedLender = connectedPool.connect(lender1)

        await connectedLender.requestCallBack()

        await expect(connectedLender.cancelCallBack())
          .to.emit(connectedPool, 'CallbackCancelled')
          .withArgs(lender1.address)
      })

      it('should fail to execute cancelCallBack if already have one', async () => {
        const { connectedPool, lender1, stableCoin } = await loadFixture(createPool)

        await runLendRequest(parseUnit('10'), connectedPool, stableCoin, lender1)

        let connectedLender = connectedPool.connect(lender1)

        await connectedLender.requestCallBack()
        await connectedLender.cancelCallBack()

        await expect(connectedLender.cancelCallBack()).to.be.revertedWith('AAD')
      })
    })

    describe('lend()', function () {
      const depositAmount = parseUnit('1')
      it('Should fail to lend triggered by non whitelisted member', async () => {
        const { pool, lender3 } = await loadFixture(createPool)

        let connectedLender = pool.connect(lender3)
        await expect(connectedLender.lend(depositAmount)).to.be.revertedWith('NPM')
      })

      it('Should fail to lend using zero value', async () => {
        const { pool, lender1 } = await loadFixture(createPool)

        let connectedLender = pool.connect(lender1)
        await expect(connectedLender.lend(0)).to.be.revertedWith('ZVL')
      })

      it('Should fail to lend into a closed pool', async () => {
        const { pool, borrower, lender1 } = await loadFixture(createPool)

        // Close  connectedPool
        await pool.connect(borrower).close()

        await expect(pool.connect(lender1).lend(depositAmount)).to.be.revertedWith('OAC')
      })

      it('Should fail to lend into a closed pool', async () => {
        const { pool, lender1, poolFactory } = await loadFixture(createPool)
        // Default pool
        await poolFactory.defaultPools([pool.address])
        await expect(pool.connect(lender1).lend(depositAmount)).to.be.revertedWith('PDD')
      })

      it('Should fail to lend with more than pool max size', async () => {
        const { pool, lender1 } = await loadFixture(createPool)

        let maxSize = await pool.maxSize()

        await expect(pool.connect(lender1).lend(maxSize.add(depositAmount))).to.be.revertedWith(
          'OSE',
        )
      })

      it('Should fail to lend from non whitelisted member', async () => {
        const { pool, lender3, prime_instance } = await loadFixture(createPool)

        await prime_instance.whitelistMember(lender3.address, BigNumber.from('1'))

        let connectedPool = pool.connect(lender3)

        await expect(connectedPool.lend(depositAmount)).to.be.revertedWith('IMB')
      })

      it('Should fail to lend because of missing asset approval', async () => {
        const { pool, lender1 } = await loadFixture(createPool)

        let connectedPool = pool.connect(lender1)

        await expect(connectedPool.lend(depositAmount)).to.be.revertedWith(
          'ERC20: insufficient allowance',
        )
      })

      it('Should fail to lend self through public pool', async () => {
        const { connectedPool, borrower, stableCoin } = await loadFixture(createPool)

        let connectedBorrower = connectedPool.connect(borrower)
        await connectedBorrower.switchToPublic()

        await expect(
          runLendRequest(depositAmount, connectedPool, stableCoin, borrower),
        ).to.be.revertedWith('BLS')
      })

      it('Should allow lender to lend after switching to public', async () => {
        const { connectedPool, stableCoin, lender1, borrower } = await loadFixture(createPool);

        await runLendRequest(depositAmount, connectedPool, stableCoin, lender1);

        let connectedBorrower = connectedPool.connect(borrower)
        await connectedBorrower.switchToPublic()

        // should skip init condition
        await runLendRequest(depositAmount, connectedPool, stableCoin, lender1);
      })

      it('Should fail to lend or whitelist self otherwise', async () => {
        const { connectedPool, borrower, stableCoin } = await loadFixture(createPool)

        let connectedBorrower = connectedPool.connect(borrower)

        await expect(
          runLendRequest(depositAmount, connectedPool, stableCoin, borrower),
        ).to.be.revertedWith('IMB')

        await expect(
          connectedBorrower.whitelistLenders(
            ethers.utils.arrayify(encodeAddressArray([borrower.address])),
          ),
        ).to.be.revertedWith('BLS')
      })

      it('Should execute first lend request with following events', async () => {
        const { pool, lender1, borrower, stableCoin } = await loadFixture(
          createPool,
        )

        const lendAmount = parseUnit('100')


        let connectedStableCoin = stableCoin.connect(lender1)
        await connectedStableCoin.approve(pool.address, lendAmount)

        let connectedLender = pool.connect(lender1)
        await expect(connectedLender.lend(depositAmount)).to.be.revertedWith("ERC20: transfer amount exceeds balance");

        await stableCoin.mint(lender1.address, lendAmount)

        const originationAmount = lendAmount.mul(await pool.originationRate())

        await expect(connectedLender.lend(depositAmount))
          .to.emit(pool, 'Activated')
          .withArgs(anyValue, anyValue)
          .to.emit(pool, 'Lent')
          .withArgs(lender1.address, depositAmount)
          .to.emit(stableCoin, 'Transfer')
          .withArgs(lender1.address, borrower.address, depositAmount)
        // 100 - 1 + 1 = 100
        expect(await stableCoin.balanceOf(borrower.address)).to.equal(
          depositAmount.sub(originationAmount),
        )

        let currentTime = await time.latest()

        expect(await pool.depositMaturity()).to.equal((await pool.depositWindow()).add(currentTime))
        expect(await pool.maturityDate()).to.equal((await pool.tenor()).add(currentTime))
      })

      it('Should fail to execute lend request after depositMaturity', async () => {
        const { pool, lender1, stableCoin } = await loadFixture(createPool)

        await runLendRequest(depositAmount, pool, stableCoin, lender1)

        await time.increase(await parseTime(day * 3))

        await expect(runLendRequest(depositAmount, pool, stableCoin, lender1)).to.be.revertedWith(
          'DWC',
        )
      })
    })

    describe('roll()', function () {
      it('Should fail to request roll if no liquidity', async () => {
        const { pool, borrower } = await loadFixture(createPool)

        let connectedPool = pool.connect(borrower)

        await expect(connectedPool.requestRoll()).to.be.revertedWith('RCR')
      })

      it('Should fail to request roll triggered by non borrower', async () => {
        const { pool, lender2 } = await loadFixture(createLendRequest)

        let connectedPool = pool.connect(lender2)
        await expect(connectedPool.requestRoll()).to.be.revertedWith('NCR')
      })

      it('Should fail to roll into a closed pool', async () => {
        const { connectedPool, stableCoin, lender1, borrower, createPoolValuesProps } =
          await loadFixture(createLendRequest)

        const totalDue = await connectedPool.dueOf(lender1.address)
        const totalDueAmount = totalDue[0].add(totalDue[1])
        // mint additional amount for borrower (imitate repayment).
        await stableCoin.mint(borrower.address, totalDueAmount)

        let connectedStableCoin = stableCoin.connect(borrower)
        await connectedStableCoin.approve(connectedPool.address, totalDueAmount)

        let connectedBorrower = connectedPool.connect(borrower)

        await time.increase(createPoolValuesProps.depositWindow)
        await connectedBorrower.repayAll()

        await expect(connectedBorrower.requestRoll()).to.be.revertedWith('OAC')
      })

      it('Should fail to roll into a default pool', async () => {
        const { connectedPool, borrower, poolFactory } =
          await loadFixture(createLendRequest)

        await poolFactory.defaultPools([connectedPool.address]);
        await expect(connectedPool.connect(borrower).requestRoll()).to.be.revertedWith('PDD')
      })

      it('Should fail to roll is already requested one', async () => {
        const { pool, borrower } = await loadFixture(createLendRequest)

        let connectedPool = pool.connect(borrower)

        await timeToRoll(connectedPool)
        await connectedPool.requestRoll();

        await expect(connectedPool.requestRoll()).to.be.revertedWith('RAR')
      })

      it('Should fail to  roll if timestamp is not 48 yours prior maturity date', async () => {
        const { pool, borrower } = await loadFixture(createLendRequest)

        let connectedPool = pool.connect(borrower)

        await time.increaseTo((await pool.maturityDate()).sub(day))

        await expect(connectedPool.requestRoll()).to.be.revertedWith('RTR')
      })

      it('Should execute roll with following events', async () => {
        const { pool, borrower, lender1, createPoolValuesProps } = await loadFixture(
          createLendRequest,
        )

        let connectedPool = pool.connect(borrower)

        let currentOrderMatuirtyDate = await pool.maturityDate()

        await timeToRoll(connectedPool)

        await expect(connectedPool.requestRoll())
          .to.emit(connectedPool, 'RollRequested')
          .withArgs(1)

        await expect(pool.connect(lender1).acceptRoll())
          .to.emit(connectedPool, 'RollAccepted')
          .withArgs(1, currentOrderMatuirtyDate.add(createPoolValuesProps.tenor))
        let newOrderMatuirtyDate = await pool.maturityDate()

        expect(newOrderMatuirtyDate).to.equal(
          currentOrderMatuirtyDate.add(createPoolValuesProps.tenor),
        )
      })

      it('Should not allow to accept roll after due date', async () => {
        const { pool, borrower, lender1 } = await loadFixture(
          createLendRequest,
        )
        let connectedPool = pool.connect(borrower)

        await timeToRoll(connectedPool)

        await expect(connectedPool.requestRoll())
          .to.emit(connectedPool, 'RollRequested')
          .withArgs(1)

        await time.increase(30 * day)

        await expect(pool.connect(lender1).acceptRoll())
          .to.be.revertedWith('RTR');
      })

      it('Should execute roll after roll', async () => {
        const { connectedPool, lender1, borrower, stableCoin } = await loadFixture(createPool)

        await runLendRequest(parseUnit('10'), connectedPool, stableCoin, lender1)

        await timeToRoll(connectedPool)

        const connectedBorrower = connectedPool.connect(borrower)
        const connectedLender = connectedPool.connect(lender1)

        await connectedBorrower.requestRoll()
        await connectedLender.acceptRoll()

        await timeToRoll(connectedPool)

        await connectedBorrower.requestRoll()
        await connectedLender.acceptRoll()

        await runRepayTo(connectedPool, borrower, lender1)
      })
      it('should fail to execute accept roll if lender have triggered callback', async () => {
        const { connectedPool, lender1, borrower, stableCoin } = await loadFixture(createPool)

        await runLendRequest(parseUnit('10'), connectedPool, stableCoin, lender1)

        await timeToRoll(connectedPool)

        let connectedBorrower = connectedPool.connect(borrower)
        await connectedBorrower.requestRoll()

        let connectedLender = connectedPool.connect(lender1)

        await expect(connectedLender.requestCallBack())
          .to.emit(connectedPool, 'RollRejected')
          .withArgs(1, lender1.address)

        await expect(connectedBorrower.acceptRoll()).to.be.revertedWith('ARM')
      })
    })

    describe('repayTo()', function () {
      it('should fail execute repay triggered by non borrower', async () => {
        const { pool, lender2, lender1 } = await loadFixture(createLendRequest)

        await expect(pool.connect(lender2).repay(lender1.address)).to.be.revertedWith('NCR')
      })

      it('should fail execute repay with zero address lender', async () => {
        const { connectedPool, borrower } = await loadFixture(createLendRequest)

        await expect(connectedPool.repay(constants.zeroAddress)).to.be.revertedWith('NZA')
      })

      it('Should fail to repay because of missing asset approval', async () => {
        const { connectedPool, borrower, lender1 } = await loadFixture(createLendRequest)

        await expect(connectedPool.repay(lender1.address)).to.be.revertedWith(
          'ERC20: insufficient allowance',
        )
      })

      it('Should fail to repay because of missing asset amount', async () => {
        const { connectedPool, borrower, lender1, stableCoin } = await loadFixture(
          createLendRequest,
        )

        let dueOfAmount = await connectedPool.dueOf(lender1.address)

        let connectedStableCoin = stableCoin.connect(borrower)

        await connectedStableCoin.approve(
          connectedPool.address,
          dueOfAmount.due.add(dueOfAmount.spreadFee),
        )

        await expect(connectedPool.repay(lender1.address)).to.be.revertedWith(
          'ERC20: transfer amount exceeds balance',
        )
      })

      it('should repay lender after callback', async () => {
        const { pool, lender1, borrower } = await loadFixture(createLendRequest)

        await pool.connect(lender1).requestCallBack()

        await expect(runRepayTo(pool, borrower, lender1)).to.be.not.reverted
      })

      it('Should execute repay request and close the pool', async () => {
        const {
          connectedPool,
          borrower,
          lender1,
          stableCoin,
          treasuryAddr,
          createPoolValuesProps,
        } = await loadFixture(createLendRequest)

        // mint additional amount for borrower (imitate repayment).
        let dueOfAmount = await connectedPool.dueOf(lender1.address)

        const totalFees = dueOfAmount.originationFee.add(dueOfAmount.spreadFee)

        const sum = dueOfAmount.due.add(dueOfAmount.spreadFee).add(dueOfAmount.originationFee)

        await stableCoin.mint(borrower.address, sum)

        let connectedStableCoin = stableCoin.connect(borrower)
        await connectedStableCoin.approve(connectedPool.address, sum)

        await time.increase(createPoolValuesProps.depositWindow)

        await expect(connectedPool.repay(lender1.address))
          .to.emit(connectedPool, 'Repayed')
          .withArgs(
            lender1.address,
            dueOfAmount.due,
            dueOfAmount.spreadFee,
            dueOfAmount.originationFee,
            dueOfAmount.penalty
          )
          .to.emit(stableCoin, 'Transfer')
          .withArgs(borrower.address, lender1.address, dueOfAmount.due)
          .to.emit(stableCoin, 'Transfer')
          .withArgs(borrower.address, treasuryAddr.address, totalFees)
          .to.emit(connectedPool, 'Closed')
          .withArgs()
      })

      it('Should repay the lender without additional fees', async () => {
        const {
          connectedPool,
          borrower,
          lender1,
          stableCoin,
          createPoolValuesProps,
        } = await loadFixture(createZeroFeesPool)

        await runLendRequest(one, connectedPool, stableCoin, lender1);

        // mint additional amount for borrower (imitate repayment).
        let dueOfAmount = await connectedPool.dueOf(lender1.address)

        const totalFees = dueOfAmount.originationFee.add(dueOfAmount.spreadFee)

        const sum = dueOfAmount.due.add(dueOfAmount.spreadFee).add(dueOfAmount.originationFee)

        await stableCoin.mint(borrower.address, sum)

        let connectedStableCoin = stableCoin.connect(borrower)
        await connectedStableCoin.approve(connectedPool.address, sum)

        await time.increase(createPoolValuesProps.depositWindow)

        expect(totalFees).to.be.equal(0);

        await expect(connectedPool.repay(lender1.address))
          .to.emit(connectedPool, 'Repayed')
          .withArgs(
            lender1.address,
            dueOfAmount.due,
            dueOfAmount.spreadFee,
            dueOfAmount.originationFee,
            dueOfAmount.penalty
          )
          .to.emit(stableCoin, 'Transfer')
          .withArgs(borrower.address, lender1.address, dueOfAmount.due)
          .to.emit(connectedPool, 'Closed')
          .withArgs()
      })

      it('Should execute repay request based on deactivated roll', async () => {
        const {
          connectedPool,
          borrower,
          lender1,
          stableCoin,
          treasuryAddr,
        } = await loadFixture(createLendRequest)

        const dueOf = await connectedPool.dueOf(lender1.address)

        await timeToRoll(connectedPool)

        await connectedPool.requestRoll()

        let totalDueAmount = dueOf.due.add(dueOf.originationFee).add(dueOf.spreadFee)

        const totalFees = dueOf.spreadFee.add(dueOf.originationFee)

        // mint additional amount for borrower (imitate repayment).
        await stableCoin.mint(borrower.address, totalDueAmount)

        await stableCoin.connect(borrower).approve(connectedPool.address, totalDueAmount)

        await expect(connectedPool.repayAll())
          .to.emit(connectedPool, 'Repayed')
          .withArgs(lender1.address, dueOf.due, dueOf.spreadFee, dueOf.originationFee, dueOf.penalty)
          .to.emit(stableCoin, 'Transfer')
          .withArgs(borrower.address, lender1.address, dueOf.due)
          .to.emit(stableCoin, 'Transfer')
          .withArgs(borrower.address, treasuryAddr.address, totalFees)
          .to.emit(connectedPool, 'Closed')
          .withArgs()

        expect(await connectedPool.activeRollId()).to.equal('0')
      })
    })

    describe('repayAll()', function () {
      it('should fail execute repay triggered by non borrower', async () => {
        const { pool, lender2, lender1 } = await loadFixture(createLendRequest)

        await expect(pool.connect(lender2).repayAll()).to.be.revertedWith('NCR')
      })

      it('Should fail to repay because of missing asset approval', async () => {
        const { connectedPool } = await loadFixture(createLendRequest)

        await expect(connectedPool.repayAll()).to.be.revertedWith(
          'ERC20: insufficient allowance',
        )
      })

      it('Should fail to repay because of missing asset amount', async () => {
        const { connectedPool, borrower, lender1, stableCoin } = await loadFixture(
          createLendRequest,
        )

        let dueOfAmount = await connectedPool.dueOf(lender1.address)

        let connectedStableCoin = stableCoin.connect(borrower)

        await connectedStableCoin.approve(
          connectedPool.address,
          dueOfAmount.due.add(dueOfAmount.spreadFee),
        )

        await expect(connectedPool.repayAll()).to.be.revertedWith(
          'ERC20: transfer amount exceeds balance',
        )
      })

      it('Should execute repay request and close the pool', async () => {
        const {
          connectedPool,
          borrower,
          lender1,
          stableCoin,
          treasuryAddr,
          createPoolValuesProps,
        } = await loadFixture(createLendRequest)

        // mint additional amount for borrower (imitate repayment).
        let dueOfAmount = await connectedPool.dueOf(lender1.address)

        const totalFees = dueOfAmount.originationFee.add(dueOfAmount.spreadFee)

        const sum = dueOfAmount.due.add(dueOfAmount.spreadFee).add(dueOfAmount.originationFee)

        await stableCoin.mint(borrower.address, sum)

        let connectedStableCoin = stableCoin.connect(borrower)
        await connectedStableCoin.approve(connectedPool.address, sum)

        await time.increase(createPoolValuesProps.depositWindow)

        await expect(connectedPool.repayAll())
          .to.emit(connectedPool, 'Repayed')
          .withArgs(
            lender1.address,
            dueOfAmount.due,
            dueOfAmount.spreadFee,
            dueOfAmount.originationFee,
            dueOfAmount.penalty
          )
          .to.emit(stableCoin, 'Transfer')
          .withArgs(borrower.address, lender1.address, dueOfAmount.due)
          .to.emit(stableCoin, 'Transfer')
          .withArgs(borrower.address, treasuryAddr.address, totalFees)
          .to.emit(connectedPool, 'Closed')
          .withArgs()
      })

      it('Should execute repay request based on deactivated roll', async () => {
        const {
          connectedPool,
          borrower,
          lender1,
          stableCoin,
          treasuryAddr,
        } = await loadFixture(createLendRequest)

        const dueOf = await connectedPool.dueOf(lender1.address)

        await timeToRoll(connectedPool)

        await connectedPool.requestRoll()

        let totalDueAmount = dueOf.due.add(dueOf.originationFee).add(dueOf.spreadFee)

        const totalFees = dueOf.spreadFee.add(dueOf.originationFee)

        // mint additional amount for borrower (imitate repayment).
        await stableCoin.mint(borrower.address, totalDueAmount)

        await stableCoin.connect(borrower).approve(connectedPool.address, totalDueAmount)

        await expect(connectedPool.repayAll())
          .to.emit(connectedPool, 'Repayed')
          .withArgs(lender1.address, dueOf.due, dueOf.spreadFee, dueOf.originationFee, dueOf.penalty)
          .to.emit(stableCoin, 'Transfer')
          .withArgs(borrower.address, lender1.address, dueOf.due)
          .to.emit(stableCoin, 'Transfer')
          .withArgs(borrower.address, treasuryAddr.address, totalFees)
          .to.emit(connectedPool, 'Closed')
          .withArgs()

        expect(await connectedPool.activeRollId()).to.equal('0')
      })
    })

    describe('repayInterest()', function () {
      it('should fail execute repayInterest triggered by non borrower', async () => {
        const { pool, lender1, stableCoin } = await loadFixture(createPool)

        await runLendRequest(one, pool, stableCoin, lender1)

        await expect(pool.connect(lender1).repayInterest()).to.be.revertedWith('NCR')
      })

      it('should fail execute repayInterest triggered into a bullet pool', async () => {
        const { pool, lender1, stableCoin, borrower } = await loadFixture(createPool)

        await runLendRequest(one, pool, stableCoin, lender1)

        await expect(pool.connect(borrower).repayInterest()).to.be.revertedWith('NML')
      })

      it('should fail execute repayInterest 2 times in 1 period', async () => {
        const { monthlyPool, lender1, stableCoin, borrower } = await loadFixture(monthlyPoolFixture)

        const lendAmount = parseUnit('100');

        await runLendRequest(lendAmount, monthlyPool, stableCoin, lender1)
        await runRepayInterest(monthlyPool, borrower);

        await time.increase(20 * 60);
        await runRepayTo(monthlyPool, borrower, lender1);
        await runLendRequest(one, monthlyPool, stableCoin, lender1)

        const dueInterestOf = await monthlyPool.totalDueInterest()

        await stableCoin.mint(borrower.address, dueInterestOf)
        await stableCoin.connect(borrower).approve(monthlyPool.address, dueInterestOf)

        await expect(monthlyPool.connect(borrower).repayInterest()).to.be.revertedWith("RTE");
      })

      it('should repayInterest into a zero fees pool', async () => {
        let zeroFeesPool = () => monthlyPoolFixture(false);
        const { monthlyPool, lender1, stableCoin, borrower } = await loadFixture(zeroFeesPool)

        const lendAmount = parseUnit('100');

        await runLendRequest(lendAmount, monthlyPool, stableCoin, lender1)

        const due = await monthlyPool.dueInterestOf(lender1.address);

        expect(due.spreadFee).to.be.equal(0);
        await expect(runRepayInterest(monthlyPool, borrower)).to.not.be.reverted;
      })

      it('should repayInterest with additional accrue', async () => {
        const { monthlyPool, lender1, stableCoin, borrower } = await loadFixture(monthlyPoolFixture)

        const lendAmount = parseUnit('100');

        await runLendRequest(lendAmount, monthlyPool, stableCoin, lender1)

        let nextPaymentTs = await monthlyPool.getNextPaymentTimestamp();

        await time.increaseTo(nextPaymentTs.add(day));

        /// making a snapshot to calculate totalDue at the moment of repayment
        const afterDue = await getDelayedValue<{ due: BigNumber, spreadFee: BigNumber }>(monthlyPool, "dueInterestOf", [lender1.address])

        let payedAmount = await runRepayInterest(monthlyPool, borrower);
        expect(payedAmount).to.be.equal(afterDue.due.add(afterDue.spreadFee));
      })
    })

    describe('dueOf()', function () {
      it('should return lender due and fee amount', async () => {
        const { prime_instance, connectedPool, lender1, repayAmount, currentTime } =
          await loadFixture(createLendRequest)

        let priorIndex = parseUnit('1', 18) // 1.0
        // let orderInfo = await connectedPool.getOrderData( );
        let newIndex = await calcSupplyIndex(
          connectedPool,
          priorIndex,
          (await connectedPool.maturityDate()).sub(currentTime),
        )

        const dueOf = await connectedPool.dueOf(lender1.address)
        const principalPlusInterest = repayAmount.mul(newIndex).div(priorIndex)

        expect(dueOf.due).to.equal(principalPlusInterest.sub(dueOf.spreadFee))

        const calculatedSpread = (await connectedPool.spreadRate())
          .mul(principalPlusInterest.sub(repayAmount))
          .div(parseUnit('1', 18))

        expect(dueOf.spreadFee).to.equal(calculatedSpread)
        expect(dueOf.spreadFee).to.equal(calculatedSpread)
      })

      it('should return lender due amount in case of requesting callback', async () => {
        const { pool, lender1, currentTime, repayAmount, createPoolValuesProps } = await loadFixture(
          createLendRequest,
        )

        await pool.connect(lender1).requestCallBack()

        let priorIndex = one
        let newTime = await time.increase(day)

        const { due, spreadFee } = await pool.dueOf(lender1.address)
        let initialIndex = await calcSupplyIndex(
          pool,
          priorIndex,
          BigNumber.from(createPoolValuesProps.tenor).sub(currentTime)
        )
        let totalInterest = repayAmount.mul(initialIndex).div(priorIndex).sub(repayAmount);
        let balanceAmount = calculateInterest(totalInterest, BigNumber.from(newTime).sub(currentTime), BigNumber.from(createPoolValuesProps.tenor).sub(currentTime)).add(repayAmount);

        expect(due).to.equal(balanceAmount.sub(spreadFee).sub(6))
      })

      it('should return lender due and penalty in case of requesting callback after maturity', async () => {
        const { pool, lender1, repayAmount, currentTime, createPoolValuesProps } =
          await loadFixture(createLendRequest)

        await time.increase(day)

        let connectedPool = pool.connect(lender1)
        await connectedPool.requestCallBack()

        let priorIndex = one
        await time.increase(createPoolValuesProps.tenor.add(2 * day))
        let newTime = await time.latest();
        let matDate = await pool.maturityDate()

        let penaltyIndex = await calcPenaltyIndex(
          pool,
          priorIndex,
          newTime - matDate.toNumber(),
        )
        let supplyIndex = await calcSupplyIndex(
          connectedPool,
          priorIndex,
          BigNumber.from(matDate).sub(currentTime),
        )

        let totalInterest = repayAmount.mul(supplyIndex).div(priorIndex).sub(repayAmount);
        let penaltyAmount = repayAmount.mul(penaltyIndex).div(priorIndex).sub(repayAmount);

        let balanceAmount = calculateInterest(totalInterest, BigNumber.from(newTime).sub(currentTime), BigNumber.from(matDate).sub(currentTime)).add(repayAmount);

        expect(await connectedPool.penaltyOf(lender1.address)).to.equal(penaltyAmount)
        expect(await connectedPool.balanceOf(lender1.address)).to.equal(balanceAmount)

        const dueOf = await connectedPool.dueOf(lender1.address)

        expect(dueOf.due).to.equal(balanceAmount.add(penaltyAmount).sub(dueOf.spreadFee))
      })
      it('should return origination fee after callback triggered in the 2 roll', async () => {
        const { lender1, anotherPool } = await loadFixture(oneLend)

        const maturityDate = async () => {
          return anotherPool.maturityDate()
        }
        const dueOf1 = async () => {
          return anotherPool.dueOf(lender1.address)
        }

        const tenor = (await anotherPool.tenor()).toNumber()
        const initialMaturity = (await maturityDate()).toNumber()

        let totalMaturity = tenor

        const loanSize = await anotherPool.currentSize()

        const originationRate = await anotherPool.originationRate()
        const incrementPerRoll = await anotherPool.incrementPerRoll()

        const originationFeePerTenor = loanSize.mul(originationRate).div(one) // tenor is year
        const originationFeePerFullRoll = originationFeePerTenor.mul(incrementPerRoll).div(one)

        await time.increaseTo((await maturityDate()).sub(3 * day))

        expect((await dueOf1()).originationFee).to.eq(
          originationFeePerTenor,
          'Origination fee in first tenor is not correct',
        )

        await anotherPool.requestRoll()
        await anotherPool.connect(lender1).acceptRoll()

        totalMaturity += tenor

        await time.increaseTo((await maturityDate()).sub(3 * day))

        expect((await dueOf1()).originationFee).to.eq(
          originationFeePerTenor.add(originationFeePerFullRoll),
          'Origination fee in first roll is not correct',
        )

        await anotherPool.requestRoll()
        await anotherPool.connect(lender1).acceptRoll()

        expect((await dueOf1()).originationFee).to.eq(
          originationFeePerTenor.add(originationFeePerFullRoll.mul(2)),
          'Origination fee in second roll is not correct',
        )

        await anotherPool.connect(lender1).requestCallBack()

        const timeInRoll = (await time.latest()) - initialMaturity

        const totalOriginationFee = originationFeePerTenor.add(
          originationFeePerFullRoll.mul(timeInRoll).div(tenor),
        )

        expect((await dueOf1()).originationFee).to.eq(
          totalOriginationFee,
          'Origination fee after callback is not correct',
        )
      })
    })

    describe('dueInterestOf()', function () {
      it("should return 0 for lender who didn't lend into monthly pool", async () => {
        const { monthlyPool, lender2 } = await loadFixture(monthlyPoolFixture)

        expect((await monthlyPool.dueInterestOf(lender2.address)).due).to.equal(0)
      })
      it("should return 0 for lender who didn't lend into bullet pool", async () => {
        const { pool, lender2 } = await loadFixture(createPool)

        expect((await pool.dueInterestOf(lender2.address)).due).to.equal(0)
      })
      it('should increase interest before, in, after maturity', async () => {
        const { monthlyPool, borrower, lender1, stableCoin } = await loadFixture(monthlyPoolFixture)

        const interest = async () => {
          const { due, spreadFee } = await monthlyPool.dueInterestOf(lender1.address);
          return due.add(spreadFee);
        }

        await runLendRequest(one, monthlyPool, stableCoin, lender1)

        const matDate = await monthlyPool.maturityDate()

        await time.increaseTo(matDate)

        // repays all interest for tenor
        await runRepayInterest(monthlyPool, borrower)

        await time.increaseTo(matDate.add(day * 300))

        const afterMaturityInterest = await interest()

        expect(afterMaturityInterest).to.be.greaterThan(
          0,
          'Interest after maturity does not increase',
        )

        await expect(runRepayAll(monthlyPool, borrower)).to.be.not.reverted
      })
      it('Should return 0 for lend after repay and before maturity', async () => {
        const { monthlyPool, borrower, lender1, lender2, stableCoin } = await loadFixture(
          monthlyPoolFixture,
        )

        const lastPaidTimestamp = async () => {
          return await monthlyPool.lastPaidTimestamp()
        }

        const nextPaymentTimestamp = async () => {
          return await monthlyPool.getNextPaymentTimestamp()
        }

        expect(await lastPaidTimestamp()).to.eq(0)
        expect(await nextPaymentTimestamp()).to.eq(0)

        const lendAmount = parseUnit('10')

        const startOfPaymentTimestamp = await runLendRequest(
          lendAmount,
          monthlyPool,
          stableCoin,
          lender1,
        )

        expect(await lastPaidTimestamp()).to.eq(startOfPaymentTimestamp)
        expect(await nextPaymentTimestamp()).to.eq(startOfPaymentTimestamp + day * 30)

        let paidInterestFirstLoan = await runRepayInterest(monthlyPool, borrower)

        expect(await lastPaidTimestamp()).to.eq(startOfPaymentTimestamp + day * 30)

        // next payment timestamp increases by 30 days to the next payment
        expect(await nextPaymentTimestamp()).to.eq(startOfPaymentTimestamp + day * 60)

        const secondLoanTime = await runLendRequest(lendAmount, monthlyPool, stableCoin, lender2)

        expect(await lastPaidTimestamp()).to.eq(startOfPaymentTimestamp + day * 30)

        expect(await nextPaymentTimestamp()).to.eq(startOfPaymentTimestamp + day * 60)

        // check due interest for both lenders
        const dueInterestOf1 = await monthlyPool.dueInterestOf(lender1.address)
        const totalDueInterest = await monthlyPool.totalDueInterest()

        const paymentForLender1 = dueInterestOf1.due.add(dueInterestOf1.spreadFee)

        const secondLoanElapsedTime = startOfPaymentTimestamp + day * 60 - secondLoanTime
        const secondLoanSupplyIndex = await calcSupplyIndex(monthlyPool, one, secondLoanElapsedTime)
        const secondLoanInterest = lendAmount.mul(secondLoanSupplyIndex).div(one).sub(lendAmount)

        const dueInterestOf2 = await monthlyPool.dueInterestOf(lender2.address)
        const paymentForLender2 = dueInterestOf2.due.add(dueInterestOf2.spreadFee)

        expect(paymentForLender1).to.eq(paidInterestFirstLoan)
        expect(paymentForLender2).to.eq(secondLoanInterest.add(8))

        // check total due interest
        expect(totalDueInterest).to.eq(paidInterestFirstLoan.add(secondLoanInterest).add(8))
      })
      it('should check dueInterestOf at maturity and after', async () => {
        const {
          pool,
          lender1,
          matDate,
          interest1,
          interest2,
          finalTime,
          currentTime,
          totalLoan
        } = await loadFixture(createLendData)

        await time.increaseTo(matDate.sub(3))
        const dueInterestMaturity = await getDelayedValue<{ due: BigNumber, spreadFee: BigNumber }>(pool, "dueInterestOf", [lender1.address]);

        expect(dueInterestMaturity.due.add(dueInterestMaturity.spreadFee)).to.eq(
          interest1.add(interest2).sub(69),
        )

        await time.increaseTo(finalTime.sub(3))

        const penaltyRate = await pool.penaltyRate(finalTime.sub(matDate))
        const penaltyAmount = totalLoan.mul(penaltyRate).div(one)

        const interestFinal = calculateInterest(interest1.add(interest2).sub(69), finalTime.sub(currentTime), matDate.sub(currentTime));

        const dueInterestTotal = await getDelayedValue<{ due: BigNumber, spreadFee: BigNumber }>(pool, "dueInterestOf", [lender1.address]);
        expect(dueInterestTotal.due.add(dueInterestTotal.spreadFee)).to.eq(
          interestFinal.add(penaltyAmount),
        )
      })

      it('should check dueInterestOf after default for bullet', async () => {
        const {
          pool,
          lender1,
          matDate,
          interest1,
          interest2,
          finalTime,
          currentTime,
          totalLoan
        } = await loadFixture(createLendData)

        await time.increaseTo(matDate.sub(3))
        const dueInterestMaturity = await getDelayedValue<{ due: BigNumber, spreadFee: BigNumber }>(pool, "dueInterestOf", [lender1.address]);

        expect(dueInterestMaturity.due.add(dueInterestMaturity.spreadFee)).to.eq(
          interest1.add(interest2).sub(69),
        )

        await time.increaseTo(finalTime.sub(1))

        const penaltyRate = await pool.penaltyRate(finalTime.sub(matDate))
        const penaltyAmount = totalLoan.mul(penaltyRate).div(one)

        await pool.connect(lender1).markPoolDefaulted();
        await time.increase(day)

        const interestFinal = calculateInterest(interest1.add(interest2).sub(69), finalTime.sub(currentTime), matDate.sub(currentTime));

        const dueInterestTotal = await getDelayedValue<{ due: BigNumber, spreadFee: BigNumber }>(pool, "dueInterestOf", [lender1.address]);
        expect(dueInterestTotal.due.add(dueInterestTotal.spreadFee)).to.eq(
          interestFinal.add(penaltyAmount),
        )
      })

      it('should check dueInterestOf after default for monthly', async () => {
        const {
          lender1,
          monthlyPool,
          stableCoin
        } = await loadFixture(monthlyPoolFixture)

        const lendAmount = parseUnit("100");

        await stableCoin.mint(lender1.address, lendAmount);
        await stableCoin.connect(lender1).approve(monthlyPool.address, lendAmount);

        // lend
        await monthlyPool.connect(lender1).lend(lendAmount);

        // transit to 1 month + grace period
        const duration = 30 * day;
        const penalty = 4 * day

        await time.increase(duration + penalty);

        const iRate = await monthlyPool.rateMantissa();
        const penaltyRate = await monthlyPool.penaltyRate(penalty + 1);

        const rate = calcAnnualRate(iRate, duration + penalty + 1);

        const interest = lendAmount.mul(rate).div(one);
        const penaltyInterest = lendAmount.mul(penaltyRate).div(one);

        await monthlyPool.connect(lender1).markPoolDefaulted();

        // update timing
        await time.increase(day);

        const dueInterestTotal = await getDelayedValue<{ due: BigNumber, spreadFee: BigNumber }>(monthlyPool, "dueInterestOf", [lender1.address]);
        expect(dueInterestTotal.due.add(dueInterestTotal.spreadFee)).to.eq(
          interest.add(penaltyInterest).add(57),
        )
      })
    })

    describe('penaltyOf()', function () {
      it('should return lender penalty before maturity', async () => {
        const { connectedPool, lender1 } = await loadFixture(createLendRequest)

        await time.increase(day)

        expect(await connectedPool.penaltyOf(lender1.address)).to.equal('0')
      })
      it('should check monthly pool penalty for many lenders', async () => {
        const { monthlyPool, borrower, lender1, lender2, stableCoin } =
          await loadFixture(monthlyPoolFixture)

        const lendAmount = parseUnit('10')

        const initTime = await runLendRequest(lendAmount, monthlyPool, stableCoin, lender1)

        await time.increase(day / 2)

        await runRepayInterest(monthlyPool, borrower)

        const secondLendTime = await runLendRequest(lendAmount, monthlyPool, stableCoin, lender2)

        const latestTime = initTime + 65 * day

        const penaltyPeriod1 = latestTime - initTime - 60 * day

        const penaltyPeriod2 = latestTime - secondLendTime - 30 * day

        await time.increaseTo(latestTime)

        const penalty1 = (await monthlyPool.penaltyRate(penaltyPeriod1)).mul(lendAmount).div(one)

        const penalty2 = (await monthlyPool.penaltyRate(penaltyPeriod2)).mul(lendAmount).div(one)

        expect(await monthlyPool.penaltyOf(lender1.address)).to.eq(penalty1)

        expect(await monthlyPool.penaltyOf(lender2.address)).to.eq(penalty2)
      })

      it('should return lender penalty amount after maturity', async () => {
        const { connectedPool, lender1, repayAmount, createPoolValuesProps } =
          await loadFixture(createLendRequest)

        let currentTime = await time.increase(createPoolValuesProps.tenor.add(day))

        let priorIndex = parseUnit('1') // 1
        let matDate = await connectedPool.maturityDate()
        let newIndex = await calcPenaltyIndex(
          connectedPool,
          priorIndex,
          BigNumber.from(currentTime).sub(matDate),
        )

        expect(await connectedPool.penaltyOf(lender1.address)).to.equal(
          newIndex.mul(repayAmount).div(priorIndex).sub(repayAmount).toString(),
        )
      })
      it('should return 0 to lender with no principal', async () => {
        const { connectedPool, lender1, lender3 } = await loadFixture(createLendRequest)

        await time.increase(year * 50)

        expect(await connectedPool.penaltyOf(lender1.address)).to.not.equal(0)
        expect(await connectedPool.penaltyOf(lender3.address)).to.eq(0)
      })
    })

    describe('penaltyRate()', function () {
      it('should return correct penalty rate', async () => {
        const { connectedPool } = await loadFixture(createLendRequest)

        let penaltyRateFor2Days = await connectedPool.penaltyRate(2 * day);
        let penaltyRatePerYear = await connectedPool.penaltyRatePerYear();

        expect(penaltyRateFor2Days).to.equal(penaltyRatePerYear.mul(2 * day).div(360 * day));
      })
    })

    describe('balanceOf()', function () {
      it('should return lender balance before maturity', async () => {
        const { connectedPool, lender1, repayAmount, currentTime } = await loadFixture(
          createLendRequest,
        )

        let increasedTime = await time.increase(day)

        let priorIndex = one

        let newIndex = await calcSupplyIndex(connectedPool, priorIndex, increasedTime - currentTime)

        expect(await connectedPool.balanceOf(lender1.address)).to.equal(
          newIndex.mul(repayAmount).div(priorIndex).add(60),
        )
      })
      it('should return 0 balance for lender with no principal', async () => {
        const { connectedPool, stableCoin, lender2 } = await loadFixture(createLendRequest)

        expect(await connectedPool.balanceOf(lender2.address)).to.eq(0)

        await runLendRequest(one, connectedPool, stableCoin, lender2)

        expect(await connectedPool.balanceOf(lender2.address)).to.not.eq(0)
      })

      it('should return lender balance amount after maturity', async () => {
        const {
          connectedPool,
          lender1,
          repayAmount,
          createPoolValuesProps,
          currentTime,
          prime_instance,
        } = await loadFixture(createLendRequest)

        const timeNow = await time.increase(createPoolValuesProps.tenor.add(day))

        let priorIndex = one

        let newIndex = await calcSupplyIndex(connectedPool, priorIndex, timeNow - currentTime)

        expect(await connectedPool.balanceOf(lender1.address)).to.equal(
          newIndex.mul(repayAmount).div(priorIndex).sub(10),
        )
      })

      it('should return lender balance amount after default', async () => {
        const {
          connectedPool,
          lender1,
          repayAmount,
          createPoolValuesProps,
          currentTime,
        } = await loadFixture(createLendRequest)

        const timeNow = await time.increase(createPoolValuesProps.tenor.add(4 * day))
        let priorIndex = one
        let newIndex = await calcSupplyIndex(connectedPool, priorIndex, timeNow - currentTime + 1)

        await connectedPool.markPoolDefaulted();

        await time.increase(day);

        expect(await connectedPool.balanceOf(lender1.address)).to.equal(
          newIndex.mul(repayAmount).div(priorIndex).sub(47),
        )
      })
    })
    describe('totalDue()', function () {
      it('should check penalty and total due', async () => {
        const { finalTime, pool, lender1, penalty, interest1, interest2, currentTime, matDate, totalLoan } = await loadFixture(
          createLendData,
        )
        await time.increaseTo(finalTime)
        expect(await pool.penaltyOf(lender1.address)).to.eq(penalty)

        const interestFinal = calculateInterest(interest1.add(interest2).sub(69), finalTime.sub(currentTime), matDate.sub(currentTime));
        expect(await pool.totalDue()).to.equal(interestFinal.add(totalLoan).add(penalty))
      })

      it('should return total due amount for 2 lenders', async () => {
        const { pool, connectedPool, borrower, lender1, lender2, stableCoin, treasuryAddr } =
          await loadFixture(createPool)

        const lendAmount = parseUnit('10')

        const firstLentTime = await runLendRequest(lendAmount, pool, stableCoin, lender1)

        await time.increase(day * 2)

        const secondLendTime = await runLendRequest(lendAmount, pool, stableCoin, lender2)

        const maturityDate = (await connectedPool.maturityDate()).toNumber()

        await time.increaseTo(maturityDate - 100)

        /// calculating

        const priorIndex = one // 1e18

        const firstLoanIndex = await calcSupplyIndex(
          connectedPool,
          priorIndex,
          maturityDate - firstLentTime,
        )

        const secondLoanIndex = await calcSupplyIndex(
          connectedPool,
          priorIndex,
          maturityDate - secondLendTime,
        )

        const firstLoan = lendAmount.mul(firstLoanIndex).div(priorIndex)

        const secondLoan = lendAmount.mul(secondLoanIndex).div(priorIndex)

        const totalLoan = firstLoan.add(secondLoan)

        const spreadRate = await connectedPool.spreadRate()

        const spreadFee1 = spreadRate.mul(firstLoan.sub(lendAmount)).div(one)

        const spreadFee2 = spreadRate.mul(secondLoan.sub(lendAmount)).div(one)

        const totalSpreadFee = spreadFee1.add(spreadFee2)

        const originationFee = totalLoan.mul(
          calcAnnualRate(await connectedPool.originationRate(), await connectedPool.tenor()).div(
            one,
          ),
        )

        expect(await connectedPool.totalDue()).to.eq(totalLoan.add(originationFee))

        expect(await runRepayAll(connectedPool, borrower)).to.equal(totalLoan.add(originationFee))
      })
    })
    describe('Data checks', function () {
      it('should return correct orderInfo after a lend', async () => {
        const { pool, createPoolValuesProps, stableCoin, lender1 } = await loadFixture(createPool)

        const repayAmount = parseUnit('70')

        await runLendRequest(repayAmount, pool, stableCoin, lender1)

        const currentTime = BigNumber.from(await time.latest())

        expect(await pool.currentSize()).to.equal(repayAmount.toString())
        expect(await pool.depositMaturity()).to.equal(currentTime.add(await pool.depositWindow()))
        expect(await pool.maturityDate()).to.equal(
          currentTime.add(createPoolValuesProps.tenor).toString(),
        )
      })
    })

    describe('Origination fee changes', function () {
      it('fee should be applied to new pools', async () => {
        const {
          poolFactory,
          borrower,
          createPoolDataProps,
          createPoolValuesProps,
          prime_instance,
          originationRate,
        } = await loadFixture(createPool)

        expect(await prime_instance.originationRate()).to.equal(originationRate)

        const connectedPoolFactory = poolFactory.connect(borrower)

        await connectedPoolFactory.createPool(createPoolDataProps, createPoolValuesProps.members)

        const poolAddress = await poolFactory.pools(2)

        const pool = await ethers.getContractAt('Pool', poolAddress)

        expect(await pool.originationRate()).to.equal(originationRate)
      })
    })
    describe('markPoolDefaulted()', function () {
      it('Should not mark defaulted twice', async () => {
        const { anotherPool, borrower, lender1, prime_instance } = await loadFixture(oneLend)

        const marturityDate = await anotherPool.maturityDate()

        await time.increaseTo(marturityDate.add(day * 3 + 1))

        await anotherPool.connect(lender1).markPoolDefaulted()

        await expect(anotherPool.connect(lender1).markPoolDefaulted()).to.be.revertedWith('PDD')
      })

      it('Should not mark defaulted if not defaulted', async () => {
        const { anotherPool, borrower, lender1, prime_instance } = await loadFixture(oneLend)

        expect(await anotherPool.defaultedAt()).to.eq(0)
      })
      it('Should not calculate penalty during default', async () => {
        const { anotherPool, borrower, lender1, prime_instance } = await loadFixture(oneLend)

        const marturityDate = await anotherPool.maturityDate()

        await time.increaseTo(marturityDate.add(day * 3 + 1))

        await anotherPool.connect(lender1).markPoolDefaulted()

        const penalty1 = await anotherPool.penaltyOf(lender1.address)

        await time.increase(day * 3 + 1)

        expect(await anotherPool.penaltyOf(lender1.address)).to.eq(penalty1)
      })
      it("Shouldn't default too early", async () => {
        const { anotherPool, borrower, lender1, prime_instance } = await loadFixture(oneLend)

        const marturityDate = await anotherPool.maturityDate()

        await time.increaseTo(marturityDate)

        await expect(anotherPool.connect(lender1).markPoolDefaulted()).to.be.revertedWith('EDR')

        await time.increase(day)

        await expect(anotherPool.connect(lender1).markPoolDefaulted()).to.be.revertedWith('EDR')

        await time.increase(2 * day + 1)

        // Default should be after 3 days since maturity

        await expect(anotherPool.connect(lender1).markPoolDefaulted()).to.be.not.reverted
      })

      it('Borrower should default his pool', async () => {
        const { anotherPool, borrower, lender1, prime_instance } = await loadFixture(oneLend)

        const marturityDate = await anotherPool.maturityDate()

        await time.increaseTo(marturityDate.add(day * 3 - 1))

        await expect(anotherPool.connect(borrower).markPoolDefaulted()).to.be.revertedWith('EDR')

        await time.increase(1)

        await expect(anotherPool.connect(borrower).markPoolDefaulted()).to.be.not.reverted
      })
      it("Shouldn't repay if pool is defaulted", async () => {
        const { anotherPool, borrower, lender1, prime_instance } = await loadFixture(oneLend)

        const marturityDate = await anotherPool.maturityDate()

        await time.increaseTo(marturityDate.add(day * 3 + 1))

        await anotherPool.connect(lender1).markPoolDefaulted()

        await expect(anotherPool.connect(borrower).repay(lender1.address)).to.be.revertedWith('PDD')
      })

      it("Shouldn't default if no lenders in pool", async () => {
        const { anotherPool, borrower, lender1 } = await loadFixture(oneLend)

        await runRepayTo(anotherPool, borrower, lender1);

        await expect(anotherPool.connect(borrower).markPoolDefaulted()).to.be.revertedWith('EDR')
      })
      it('Should default monthly pool from lender with principal', async () => {
        const { monthlyPool, borrower, lender1, lender2, stableCoin } = await loadFixture(
          monthlyPoolFixture,
        )

        const initialTimestemp = await runLendRequest(one, monthlyPool, stableCoin, lender1)

        await time.increase(day / 3)

        await runRepayInterest(monthlyPool, borrower)

        await time.increase(day / 3)

        const secondTimestamp = await runLendRequest(one, monthlyPool, stableCoin, lender2)

        await time.increaseTo(initialTimestemp + (day * 63 + 1))

        expect(await monthlyPool.canBeDefaulted()).to.eq(true)

        await runRepayTo(monthlyPool, borrower, lender2)

        expect(await monthlyPool.canBeDefaulted()).to.eq(true)

        await expect(monthlyPool.connect(lender2).markPoolDefaulted()).to.be.revertedWith('IMB')

        await expect(monthlyPool.connect(lender1).markPoolDefaulted()).to.be.not.reverted

        expect(await monthlyPool.canBeDefaulted()).to.eq(false)
      })

      it('Should mark pool as defaulted on time', async () => {
        const { anotherPool, borrower, lender1, prime_instance } = await loadFixture(oneLend)

        const marturityDate = await anotherPool.maturityDate()

        await time.increaseTo(marturityDate.add(day * 3 + 1))

        expect(await anotherPool.connect(lender1).markPoolDefaulted()).to.emit(anotherPool, "Defaulted");
      })
    })
    describe('Default from factory', function () {
      it('Should mark all pools as defaulted', async () => {
        const { borrower, poolFactory, root, lender1, pool, emptyPool, stableCoin } =
          await loadFixture(createPool)

        await runLendRequest(one, pool, stableCoin, lender1)

        expect(await pool.defaultedAt()).to.eq(0)

        expect(await emptyPool.defaultedAt()).to.eq(0)

        await poolFactory.connect(root).defaultPools([pool.address, emptyPool.address])

        const currentTime = await time.latest()

        expect(await pool.defaultedAt()).to.eq(currentTime)

        expect(await emptyPool.defaultedAt()).to.eq(currentTime)
      })
    })
    describe('getNextPaymentTimestamp()', function () {
      it('should return timestamp if last period less than 1 month', async () => {
        const { borrower, lender1, shortPool, stableCoin } = await loadFixture(shortMonthlyPool)

        const nextTimestamp = async () => {
          return shortPool.getNextPaymentTimestamp().then(v => v.toNumber())
        }

        const initTime = await runLendRequest(one, shortPool, stableCoin, lender1)

        let paymentTimestamp = initTime + day * 30

        // first 30 days
        expect(await nextTimestamp()).to.eq(paymentTimestamp, 'Wrong first payment timestamp')

        await runRepayInterest(shortPool, borrower)

        paymentTimestamp += day * 30

        await time.increase(day * 30)

        // second 30 days
        expect(await nextTimestamp()).to.eq(paymentTimestamp, 'Wrong second payment timestamp')

        paymentTimestamp += day * 30

        await runRepayInterest(shortPool, borrower)

        await time.increase(day * 30)

        // third 30 days
        expect(await nextTimestamp()).to.eq(paymentTimestamp, 'Wrong third payment timestamp')

        paymentTimestamp += day * 30

        await runRepayInterest(shortPool, borrower)

        await time.increase(day * 30)

        // final 10 days
        const finalTimestamp = (await shortPool.maturityDate()).toNumber() - paymentTimestamp

        paymentTimestamp += finalTimestamp

        expect(await nextTimestamp()).to.eq(paymentTimestamp, 'Wrong final payment timestamp')
        await runRepayTo(shortPool, borrower, lender1)
      })
      it('should return timestamp if last period is longer then month', async () => {
        const { borrower, lender1, shortPool, stableCoin } = await loadFixture(shortMonthlyPool)

        const nextTimestamp = async () => {
          return (await shortPool.getNextPaymentTimestamp()).toNumber()
        }

        const initTime = await runLendRequest(one, shortPool, stableCoin, lender1)

        let tenor = await shortPool.tenor();

        let periods = tenor.div(30 * day).toNumber();
        for (let i = 0; i < periods; i++) {
          await runRepayInterest(shortPool, borrower);
          await time.increase(30 * day);
        }

        let paymentTimestamp = initTime + (await shortPool.tenor()).toNumber()
        expect(await nextTimestamp()).to.eq(paymentTimestamp, 'Wrong total payment timestamp')
      })
    })
  })

  describe('Use cases test', function () {
    describe('3# Math compliance regular test', function () {
      it('Check total values', async () => {
        const { borrower, lender1, stableCoin, anotherPool, treasuryAddr } = await loadFixture(
          oneLend,
        )

        // During test we should get the following values:
        const initialLoan = parseUnit('10000000') // 10,000,000
        const interestRateSpreadAmount = parseUnit('100000') // 100,000
        const originationFeeAmount = parseUnit('50000') // 50,000
        const interestBorrowerPaid = parseUnit('1000000') // 1,000,000
        const interestLenderRecieves = parseUnit('900000') // 900,000
        const totalBorrowerRepayment = parseUnit('11050000') // 11,050,000
        const totalLenderRecieves = parseUnit('10900000') // 10,900,000
        const totalClearPoolRecieves = parseUnit('150000') // 150,000

        // Check that the values are correct
        expect(totalBorrowerRepayment).to.eq(totalLenderRecieves.add(totalClearPoolRecieves))
        expect(totalLenderRecieves).to.eq(initialLoan.add(interestLenderRecieves))
        expect(totalClearPoolRecieves).to.eq(originationFeeAmount.add(interestRateSpreadAmount))

        await stableCoin.mint(borrower.address, totalBorrowerRepayment)
        await stableCoin.connect(borrower).approve(anotherPool.address, totalBorrowerRepayment)

        await expect(() => anotherPool.connect(borrower).repayAll()).to.changeTokenBalances(
          stableCoin,
          [borrower, anotherPool, lender1, treasuryAddr],
          [totalBorrowerRepayment.mul(-1), 0, totalLenderRecieves, totalClearPoolRecieves],
        )
      })
    })
    describe('4# Math Compliance Test Rolling', function () {
      it('rolling test', async () => {
        const { borrower, lender1, stableCoin, anotherPool, treasuryAddr } = await loadFixture(
          oneLend,
        )

        // During test we should get the following values:
        const interestRateSpreadAmount = parseUnit('200000') // 200,000
        const originationFeeAmount = parseUnit('55000') // 55,000 * 10^18 + 5000 due to solidity rounding
        const interestBorrowerPaid = parseUnit('2000000') // 2,000,000
        const interestLenderRecieves = parseUnit('1800000') // 1,800,000
        const totalBorrowerRepayment = parseUnit('12055000') // 12,055,000
        const totalLenderRecieves = parseUnit('11800000') // 11,800,000
        const totalClearPoolRecieves = parseUnit('255000') // 255,000
        // Added ONE due to solidity rounding

        const connectedBorrower = anotherPool.connect(borrower)
        const initialMaturity = await anotherPool.maturityDate()
        await time.increaseTo((await anotherPool.maturityDate()).sub(3 * day))

        /// roll for maturity
        await connectedBorrower.requestRoll()
        await anotherPool.connect(lender1).acceptRoll()

        await time.increaseTo((await anotherPool.maturityDate()).sub(3 * day))

        await stableCoin.mint(borrower.address, totalBorrowerRepayment)
        await stableCoin.connect(borrower).approve(anotherPool.address, totalBorrowerRepayment)

        expect(await anotherPool.maturityDate()).to.eq(
          initialMaturity.add(await anotherPool.tenor()),
        )

        await expect(() => anotherPool.connect(borrower).repayAll()).to.changeTokenBalances(
          stableCoin,
          [borrower, lender1, treasuryAddr],
          [totalBorrowerRepayment.mul(-1), totalLenderRecieves, totalClearPoolRecieves],
        )
      })
    })
    describe('6# Borrower can ask for a roll if there is only one lender left', function () {
      it('Borrower should fail to ask for a roll if there is other lenders', async () => {
        const { borrower, lender1, lender2, pool } = await loadFixture(twoLends)

        await expect(pool.connect(borrower).requestRoll()).to.be.revertedWith('RCR')
      })
      it('Borrower ask for a roll if there is other lenders', async () => {
        const { borrower, lender1, lender2, pool } = await loadFixture(twoLends)

        await runRepayTo(pool, borrower, lender1)

        await timeToRoll(pool)

        await pool.connect(borrower).requestRoll()

        // await pool.connect(lender1).acceptRoll();
        await expect(pool.connect(lender1).acceptRoll()).to.be.revertedWith('IMB')

        // check repay amount here and repay
      })
    })
    describe("7# Frozen borrower can't create new Pools", function () {
      it('Borrower should fail to create a new pool if he is frozen', async () => {
        const { borrower, prime_instance, poolFactory, createPoolDataProps } = await loadFixture(
          oneLend,
        )

        const memberStruct = (await prime_instance.membershipOf(
          borrower.address,
        )) as IPrime.MemberStruct

        await prime_instance.blacklistMember(borrower.address)

        await expect(
          poolFactory.connect(borrower).createPool(createPoolDataProps, []),
        ).to.be.revertedWith('NPM')

        await prime_instance.whitelistMember(borrower.address, memberStruct.riskScore)

        await poolFactory.connect(borrower).createPool(createPoolDataProps, [])
      })
    })
    describe("8# Frozen lender can't provide liquidity", function () {
      it('Lender should fail to provide liquidity if he is frozen', async () => {
        const {
          borrower,
          stableCoin,
          lender1,
          prime_instance,
          poolFactory,
          createPoolDataProps,
          pool,
        } = await loadFixture(createPool)

        const lendAmount = parseUnit('10')

        const memberStruct = (await prime_instance.membershipOf(
          lender1.address,
        )) as IPrime.MemberStruct

        await prime_instance.blacklistMember(lender1.address)

        await expect(runLendRequest(lendAmount, pool, stableCoin, lender1)).to.be.revertedWith(
          'NPM',
        )

        await prime_instance.whitelistMember(lender1.address, memberStruct.riskScore)

        await expect(runLendRequest(lendAmount, pool, stableCoin, lender1)).to.be.not.reverted
      })
    })
    describe('9# Request roll before the second lend', function () {
      it('Borrower should fail to request roll before the second lend', async () => {
        const { borrower, emptyPool, lender1, lender2, stableCoin } = await loadFixture(createPool)

        const lendAmount = parseUnit('1')

        await runLendRequest(lendAmount, emptyPool, stableCoin, lender1)

        await timeToRoll(emptyPool)

        await emptyPool.connect(borrower).requestRoll()

        await expect(runLendRequest(lendAmount, emptyPool, stableCoin, lender2)).to.be.reverted

        await expect(emptyPool.connect(lender2).acceptRoll()).to.be.revertedWith('IMB')
      })
    })
    describe('10# Lend after roll', function () {
      it('double check it', async () => {
        const { borrower, connectedPool, createPoolValuesProps, stableCoin, lender1, lender2 } =
          await loadFixture(createPool)

        const lendAmount = parseUnit('10')

        await runLendRequest(lendAmount, connectedPool, stableCoin, lender1)

        await timeToRoll(connectedPool)

        await connectedPool.connect(borrower).requestRoll()

        await connectedPool.connect(lender1).acceptRoll()

        await expect(runLendRequest(lendAmount, connectedPool, stableCoin, lender2)).to.be.reverted
      })
    })
    describe('11# Monthly repayment math check', function () {
      const totalBorrowerRepayment = parseUnit('12055000', 18)
      const totalLenderRecieves = parseUnit('11800000', 18)
      const totalClearPoolRecieves = parseUnit('255000', 18)

      const monthPaymentPrecisionTerm = BigNumber.from(3333333)
      const spreadPrecisionTerm = BigNumber.from(3000000)

      let perMonthPayment = BigNumber.from(0)
      let perMonthSpread = BigNumber.from(0)
      let perMonthInterest = BigNumber.from(0)
      let totalOriginationFee = BigNumber.from(0)

      before('before all hook', async () => {
        const { monthlyPool, borrower, lender1, stableCoin, lendAmount } = await loadFixture(
          oneMonthlyLend,
        )

        const due = await monthlyPool.dueInterestOf(lender1.address)

        const firstMonthIndex = await calcSupplyIndex(monthlyPool, one, 30 * day)

        const principalPlusInterest = firstMonthIndex.mul(lendAmount).div(one)

        const monthPayment = principalPlusInterest.sub(lendAmount)

        const spreadFee = (await monthlyPool.spreadRate()).mul(monthPayment).div(one)

        perMonthPayment = monthPayment.add(monthPaymentPrecisionTerm)
        perMonthSpread = spreadFee
        perMonthInterest = monthPayment.sub(spreadFee).add(3000000)
      })

      it('first repayAll should be correct, check balanceOf', async () => {
        const { monthlyPool, borrower, lender1, stableCoin, lendAmount, prime_instance } =
          await loadFixture(oneMonthlyLend)

        await time.increase(day)

        const totalDue = await monthlyPool.totalDue()

        expect(await stableCoin.balanceOf(borrower.address)).to.equal(0)

        await stableCoin.mint(borrower.address, totalDue)
        await stableCoin.connect(borrower).approve(monthlyPool.address, totalDue)

        await monthlyPool.connect(borrower).repayAll()

        expect(await stableCoin.balanceOf(borrower.address)).to.equal(0)
      })
      it('first month interest should be correct', async () => {
        const { monthlyPool, borrower, lender1, stableCoin, lendAmount, prime_instance } =
          await loadFixture(oneMonthlyLend)

        await time.increase(day)

        const due = await monthlyPool.dueInterestOf(lender1.address)

        const firstMonthIndex = await calcSupplyIndex(monthlyPool, one, 30 * day)

        const principalPlusInterest = firstMonthIndex.mul(lendAmount).div(one)

        const monthPayment = principalPlusInterest.sub(lendAmount)

        expect(perMonthInterest.add(perMonthSpread)).to.eq(monthPayment.add(3000000))

        const spreadFee = (await monthlyPool.spreadRate()).mul(monthPayment).div(one)

        expect(due.due).to.eq(monthPayment.sub(spreadFee).add(spreadPrecisionTerm))

        expect(due.spreadFee).to.eq(spreadFee.add(333333))

        await stableCoin.mint(
          borrower.address,
          monthPayment.add(spreadPrecisionTerm.add(monthPaymentPrecisionTerm)),
        )
        await stableCoin
          .connect(borrower)
          .approve(
            monthlyPool.address,
            monthPayment.add(spreadPrecisionTerm.add(monthPaymentPrecisionTerm)),
          )

        const toLender = monthPayment.sub(spreadFee).add(spreadPrecisionTerm)

        const toPool = spreadFee.add(333333)
        await expect(monthlyPool.repayInterest())
          .to.emit(monthlyPool, 'RepayedInterest')
          .withArgs(lender1.address, toLender, toPool, due.penalty)
          .to.emit(stableCoin, 'Transfer')
          .withArgs(borrower.address, lender1.address, toLender)
          .to.emit(stableCoin, 'Transfer')
          .withArgs(borrower.address, await prime_instance.treasury(), toPool)
      })

      it('check repayments from 0 to 23', async () => {
        const { root, monthlyPool, borrower, lender1, stableCoin, lendAmount, prime_instance } =
          await loadFixture(oneMonthlyLend)

        const toPay = perMonthPayment.add(monthPaymentPrecisionTerm)

        for (let index = 0; index < 23; index++) {
          await stableCoin.mint(borrower.address, toPay)

          await stableCoin.connect(borrower).approve(monthlyPool.address, toPay)

          /// run roll before last payment of this tenor
          if (index === 11) {
            await timeToRoll(monthlyPool)

            await monthlyPool.requestRoll()
            await monthlyPool.connect(lender1).acceptRoll()
          }

          await monthlyPool.repayInterest()

          await time.increase(30 * day)
        }
      })

      it('check total amounts', async () => {
        const { root, monthlyPool, borrower, lender1, stableCoin, lendAmount, prime_instance } =
          await loadFixture(oneMonthlyLend)

        const lastPaymentToLender = lendAmount.add(perMonthInterest)

        totalOriginationFee = (await monthlyPool.originationRate()).mul(lendAmount).div(one) // tenor is year

        // add increment per roll to originationFee
        totalOriginationFee = totalOriginationFee.add(
          totalOriginationFee.mul(await monthlyPool.incrementPerRoll()).div(one),
        )

        const totalFeesToPay = totalOriginationFee.add(perMonthSpread)

        const lastPayment = totalFeesToPay.add(lastPaymentToLender).add(333333)

        const lastDueInterestOf = await monthlyPool.dueInterestOf(lender1.address)

        const lastDueInterestOfTotal = lastDueInterestOf.due.add(lastDueInterestOf.spreadFee)

        // check last payment
        expect(lastPayment).to.eq(lastDueInterestOfTotal.add(lendAmount).add(totalOriginationFee))

        const lastTotalDueInterest = await monthlyPool.totalDueInterest()

        expect(totalBorrowerRepayment).to.eq(
          lendAmount.add(perMonthPayment.mul(24)).add(totalOriginationFee).add(8),
          // 8 [8 * 10^-18] is the gap between typescript and solidity (less then 1 cent)
        )

        expect(totalLenderRecieves).to.eq(
          lendAmount.add(perMonthInterest.mul(24)),
          // 72000000 [7.2 * 10^-10] is the gap between typescript and solidity (less then 1 cent)
        )

        expect(totalClearPoolRecieves).to.eq(
          perMonthSpread.mul(24).add(totalOriginationFee).add(BigNumber.from('8000000')),
          // 8000000 [8 * 10^-11] is the gap between typescript and solidity (less then 1 cent)
        )
      })
      it('check the last payment:', async () => {
        const { root, monthlyPool, borrower, lender1, stableCoin, lendAmount, prime_instance } =
          await loadFixture(oneMonthlyLend)

        const toPay = perMonthPayment.add(monthPaymentPrecisionTerm)

        for (let index = 0; index < 23; index++) {
          /// run roll before last payment of this tenor
          if (index === 11) {
            await timeToRoll(monthlyPool)

            await monthlyPool.requestRoll()
            await monthlyPool.connect(lender1).acceptRoll()
          }

          await stableCoin.mint(borrower.address, toPay)

          await stableCoin.connect(borrower).approve(monthlyPool.address, toPay)

          await monthlyPool.repayInterest()

          /// increase time to next month
          await time.increase(30 * day)
        }

        // double check for possible penalty
        expect(await time.latest()).to.lessThan(await monthlyPool.maturityDate())

        totalOriginationFee = (await monthlyPool.originationRate()).mul(lendAmount).div(one) // tenor is year

        // add increment per roll to originationFee
        totalOriginationFee = totalOriginationFee.add(
          totalOriginationFee.mul(await monthlyPool.incrementPerRoll()).div(one),
        )

        const lastPayment = perMonthPayment
          .mul(24)
          .add(totalOriginationFee)
          .add(lendAmount)
          .add(one) /// one for precision

        const lastPaymentToLender = lendAmount.add(perMonthInterest).add(BigNumber.from('72000000'))

        await stableCoin.mint(borrower.address, lastPayment)
        await stableCoin.connect(borrower).approve(monthlyPool.address, lastPayment)

        await expect(monthlyPool.repayAll())
          .to.emit(monthlyPool, 'Repayed')
          .withArgs(
            lender1.address,
            lastPaymentToLender.sub(71999999),
            perMonthSpread.add(BigNumber.from('333333')),
            totalOriginationFee,
            anyValue
          )
          .to.emit(monthlyPool, 'Closed')
          .to.emit(stableCoin, 'Transfer')
          .withArgs(borrower.address, lender1.address, lastPaymentToLender.sub(71999999))
          .to.emit(stableCoin, 'Transfer')
          .withArgs(
            borrower.address,
            await prime_instance.treasury(),
            perMonthSpread.add(totalOriginationFee.add(333333)),
          )
      })
    })

    describe('Origination fee after roll and many loans and callbacks', () => {
      const lendAmount = parseUnit('1000')
      it('check full origination fee', async () => {
        const { monthlyPool, lender1, borrower, stableCoin, monthlyPoolDataProps } =
          await loadFixture(monthlyPoolFixture)

        const firstLoanTime = await runLendRequest(lendAmount, monthlyPool, stableCoin, lender1)

        const originationFeeOneTenor = lendAmount
          .mul(await monthlyPool.originationRate())
          .div(one)
          .mul(monthlyPoolDataProps.tenor)
          .div(year)

        await time.increase(day / 2)

        expect((await monthlyPool.dueOf(lender1.address)).originationFee).to.eq(
          originationFeeOneTenor,
        )

        const secondLoanTime = await runLendRequest(lendAmount, monthlyPool, stableCoin, lender1)
      })
      it('check second origination fee', async () => {
        const { monthlyPool, lender1, borrower, stableCoin, monthlyPoolDataProps } =
          await loadFixture(monthlyPoolFixture)

        const firstLoanTime = await runLendRequest(lendAmount, monthlyPool, stableCoin, lender1)

        const originationFeeOneTenor = lendAmount
          .mul(await monthlyPool.originationRate())
          .div(one)
          .mul(monthlyPoolDataProps.tenor)
          .div(year)

        await time.increase(day / 2)

        const secondLoanTime = await runLendRequest(lendAmount, monthlyPool, stableCoin, lender1)

        const unusedTime = secondLoanTime - firstLoanTime

        const originationFeeSecond = lendAmount
          .mul(await monthlyPool.originationRate())
          .div(one)
          .mul(monthlyPoolDataProps.tenor.sub(unusedTime))
          .div(year)

        expect((await monthlyPool.dueOf(lender1.address)).originationFee).to.eq(
          originationFeeOneTenor.add(originationFeeSecond).sub(135),
        )
      })

      it('check second origination fee after callback', async () => {
        const { monthlyPool, lender1, borrower, stableCoin, monthlyPoolDataProps } =
          await loadFixture(monthlyPoolFixture)

        const firstLoanTime = await runLendRequest(lendAmount, monthlyPool, stableCoin, lender1)

        await time.increase(day / 2)

        const secondLoanTime = await runLendRequest(lendAmount, monthlyPool, stableCoin, lender1)

        await monthlyPool.connect(lender1).requestCallBack()

        const unusedTime = secondLoanTime - firstLoanTime

        const callbackTime = (await monthlyPool.depositMaturity()).add(10 * day).toNumber()

        await time.increaseTo(callbackTime)

        const timeElapsed1 = callbackTime - firstLoanTime
        const timeElapsed2 = callbackTime - secondLoanTime

        const originationFee1Callback = lendAmount
          .mul(await monthlyPool.originationRate())
          .div(one)
          .mul(timeElapsed1)
          .div(year)

        const originationFee2Callback = lendAmount
          .mul(await monthlyPool.originationRate())
          .div(one)
          .mul(timeElapsed2)
          .div(year)

        expect((await monthlyPool.dueOf(lender1.address)).originationFee).to.eq(
          originationFee1Callback.add(originationFee2Callback).add(310),
        )
      })

      it('check origination fee after roll', async () => {
        const { monthlyPool, lender1, borrower, stableCoin, monthlyPoolDataProps } =
          await loadFixture(monthlyPoolFixture)

        const firstLoanTime = await runLendRequest(lendAmount, monthlyPool, stableCoin, lender1)

        const originationFeeOneTenor = lendAmount
          .mul(await monthlyPool.originationRate())
          .div(one)
          .mul(monthlyPoolDataProps.tenor)
          .div(year)

        await time.increase(day / 2)

        const secondLoanTime = await runLendRequest(lendAmount, monthlyPool, stableCoin, lender1)

        const unusedTime = secondLoanTime - firstLoanTime

        const originationFeeSecond = lendAmount
          .mul(await monthlyPool.originationRate())
          .div(one)
          .mul(monthlyPoolDataProps.tenor.sub(unusedTime))
          .div(year)

        await timeToRoll(monthlyPool)

        await monthlyPool.requestRoll()

        await monthlyPool.connect(lender1).acceptRoll()

        const rolledOriginatoinFee = originationFeeOneTenor
          .mul(2)
          .mul(await monthlyPool.incrementPerRoll())
          .div(one)

        expect((await monthlyPool.dueOf(lender1.address)).originationFee).to.eq(
          originationFeeOneTenor.add(originationFeeSecond).add(rolledOriginatoinFee).sub(135),
        )
      })
    })
    describe('Monthly loan after loan', () => {
      const lendAmount = parseUnit('1000')

      it('check repayment after lend + repayment + lend', async () => {
        const { monthlyPool, lender1, borrower, stableCoin } = await loadFixture(monthlyPoolFixture)

        let totalInterest = BigNumber.from(0)

        const rateMantissa = await monthlyPool.rateMantissa()
        const tenor = await monthlyPool.tenor()

        const firstLoanTime = await runLendRequest(lendAmount, monthlyPool, stableCoin, lender1)

        totalInterest = lendAmount.mul(rateMantissa).div(one).mul(tenor).div(year)

        const initialPaidTimestamp = (await monthlyPool.getNextPaymentTimestamp()).toNumber()

        const fullMonthInterest = await runRepayInterest(monthlyPool, borrower)

        totalInterest = totalInterest.sub(fullMonthInterest)

        await time.increase(day / 2)

        const secondLoanTime = await runLendRequest(lendAmount, monthlyPool, stableCoin, lender1)

        totalInterest = totalInterest.add(
          lendAmount
            .mul(rateMantissa)
            .div(one)
            .mul(tenor.sub(secondLoanTime - firstLoanTime))
            .div(year),
        )

        const paymentTimestamp = (await monthlyPool.getNextPaymentTimestamp()).toNumber()

        const totalPayment = totalInterest
          .mul(paymentTimestamp - initialPaidTimestamp)
          .div(tenor.sub(paymentTimestamp - initialPaidTimestamp))

        const due = await monthlyPool.dueInterestOf(lender1.address)

        expect(due.spreadFee.add(due.due)).to.eq(totalPayment.sub(29))
      })
    })
  })

  describe('Use case test 1', function () {
    it('Should return correct values', async () => {
      const { poolFactory, prime_instance, lender1, borrower, stableCoin } = await loadFixture(deployPoolFactoryandBeacon);

      await prime_instance.whitelistMember(lender1.address, BigNumber.from('1'))

      const values: IPool.PoolDataStruct = {
        isBulletLoan: false,
        asset: stableCoin.address,
        size: parseUnit('100000'),
        tenor: BigNumber.from(8640000),
        rateMantissa: parseUnit('0.15'),
        depositWindow: BigNumber.from(2592000),
      }

      await poolFactory.connect(borrower).createPool(values, ethers.utils.arrayify([]));
      const poolAddr = await poolFactory.pools(0)
      // approve and mint values

      const pool = await ethers.getContractAt('Pool', poolAddr)

      const lendAmount = parseUnit('1000')

      await stableCoin.mint(lender1.address, lendAmount)
      await stableCoin.connect(lender1).approve(pool.address, lendAmount)

      await pool.connect(lender1).lend(lendAmount);

      // timestamp start = 34813386 
      // timestamp end = 35174981 
      // delta = 361.595
      let dueInterestOf = await pool.dueInterestOf(lender1.address);

      const interest = calcAnnualRate(values.rateMantissa as BigNumber, values.tenor.toString()).mul(lendAmount).div(one);
      const dueInterest = calculateInterest(interest, 30 * day, values.tenor.toString());
      expect(dueInterestOf.due).to.be.equal(dueInterest);

      await time.increase(361595)

      // it should have 
      await stableCoin.mint(borrower.address, lendAmount)
      await stableCoin.connect(borrower).approve(pool.address, lendAmount)

      expect(await stableCoin.balanceOf(borrower.address)).to.be.equal(lendAmount.add(lendAmount));
      await expect(
        pool.connect(borrower).repayInterest()
      ).to.emit(pool, "RepayedInterest")
        .withArgs(lender1.address, dueInterest, 0, dueInterestOf.penalty)

      expect(dueInterestOf.due).to.be.equal(dueInterest);

      await expect(pool.connect(borrower).repayInterest()).to.be.revertedWith("RTE");
    })
  })

  describe('Use case test 2', function () {
    it('Should return correct values', async () => {
      const { poolFactory, prime_instance, lender1, borrower, stableCoin } = await loadFixture(deployPoolFactoryandBeacon);

      await prime_instance.whitelistMember(lender1.address, BigNumber.from('1'))

      const values: IPool.PoolDataStruct = {
        isBulletLoan: false,
        asset: stableCoin.address,
        size: parseUnit('30000'),
        tenor: BigNumber.from(5616000),
        rateMantissa: parseUnit('0.044'),
        depositWindow: BigNumber.from(864000),
      }

      await poolFactory.connect(borrower).createPool(values, ethers.utils.arrayify([]));
      const poolAddr = await poolFactory.pools(0)
      // approve and mint values

      const pool = await ethers.getContractAt('Pool', poolAddr)

      const lendAmount = parseUnit('150')

      await stableCoin.mint(lender1.address, lendAmount)
      await stableCoin.connect(lender1).approve(pool.address, lendAmount)

      await pool.connect(lender1).lend(lendAmount);

      // timestamp start = 34599705
      // timestamp end = 35189961
      // delta = 590256
      let dueInterestOf = await pool.dueInterestOf(lender1.address);

      const interest = calcAnnualRate(values.rateMantissa as BigNumber, values.tenor.toString()).mul(lendAmount).div(one);
      const dueInterest = calculateInterest(interest, 30 * day, values.tenor.toString());
      expect(dueInterestOf.due).to.be.equal(dueInterest);

      let dueOf = await pool.dueOf(lender1.address);
      expect(dueOf.due.add(dueOf.spreadFee)).to.be.equal(interest.add(lendAmount));

      await time.increase(6 * day)

      // it should have 
      await stableCoin.mint(borrower.address, lendAmount)
      await stableCoin.connect(borrower).approve(pool.address, lendAmount)

      expect(await stableCoin.balanceOf(borrower.address)).to.be.equal(lendAmount.add(lendAmount));
      await expect(
        pool.connect(borrower).repayInterest()
      ).to.emit(pool, "RepayedInterest")
        .withArgs(lender1.address, dueInterest, 0, dueInterestOf.penalty)

      expect(dueInterestOf.due).to.be.equal(dueInterest);

      await pool.connect(lender1).requestCallBack();

      dueOf = await pool.dueOf(lender1.address);
      // interest already paid until next period start
      expect(dueOf.due.add(dueOf.spreadFee)).to.be.equal(lendAmount);
      expect((await pool.dueInterestOf(lender1.address)).due).to.be.equal(dueInterest);
      await expect(pool.connect(borrower).repayInterest()).to.be.revertedWith("RTE");


      await time.increase(32 * day)
      dueOf = await pool.dueOf(lender1.address);

      // interest should be available for 2 days
      const dueAmount = calculateInterest(interest, 8 * day + 5, values.tenor.toString());
      expect(dueOf.due.add(dueOf.spreadFee)).to.be.equal(dueAmount.add(lendAmount));
    })
  })

  describe('Use case test 3', function () {
    it('Should return correct values', async () => {
      const { poolFactory, prime_instance, lender1, borrower, stableCoin } = await loadFixture(deployPoolFactoryandBeacon);

      await prime_instance.whitelistMember(lender1.address, BigNumber.from('1'))

      const values: IPool.PoolDataStruct = {
        isBulletLoan: false,
        asset: stableCoin.address,
        size: parseUnit('10000'),
        tenor: BigNumber.from(5616000),
        rateMantissa: parseUnit('0.15'),
        depositWindow: BigNumber.from(864000),
      }

      await prime_instance.setOriginationRate(parseUnit("0.05", 16))

      await poolFactory.connect(borrower).createPool(values, ethers.utils.arrayify([]));
      let startTime = await time.latest()
      const poolAddr = await poolFactory.pools(0)
      // approve and mint values

      const pool = await ethers.getContractAt('Pool', poolAddr)

      const lendAmount = parseUnit('1000')

      await stableCoin.mint(lender1.address, lendAmount)
      await stableCoin.connect(lender1).approve(pool.address, lendAmount)

      await pool.connect(lender1).lend(lendAmount);

      await time.increase(day)

      await pool.connect(lender1).requestCallBack();


      let dueInterestOf = await pool.dueInterestOf(lender1.address);
      const interest = calcAnnualRate(values.rateMantissa as BigNumber, values.tenor.toString()).mul(lendAmount).div(one);
      const dueInterest = calculateInterest(interest, 30 * day, values.tenor.toString());
      expect(dueInterestOf.due).to.be.equal(dueInterest);

      // it should have 
      await stableCoin.mint(borrower.address, lendAmount)
      await stableCoin.connect(borrower).approve(pool.address, lendAmount.add(lendAmount))
      expect(await stableCoin.balanceOf(borrower.address)).to.be.equal(lendAmount.add(lendAmount));

      await expect(
        pool.connect(borrower).repayInterest()
      ).to.emit(pool, "RepayedInterest")
        .withArgs(lender1.address, dueInterest, 0, dueInterestOf.penalty)

      expect(dueInterestOf.due).to.be.equal(dueInterest);


      await time.increase(day);

      let dueOf = await pool.dueOf(lender1.address)
      expect(dueOf.due).to.be.equal(lendAmount);
      expect(dueOf.penalty).to.be.equal(0);
      expect(dueOf.spreadFee).to.be.equal(0);


      // time end = 1683645536
      // time end = 1683644900
      // delta = 636

      let now = await time.latest()
      const originationRate = calcAnnualRate(parseUnit("0.05", 16), now - 3 - startTime);
      const originationFee = originationRate.mul(lendAmount).div(one);

      expect(dueOf.originationFee).to.be.equal(originationFee);


      const newOriginationRate = calcAnnualRate(parseUnit("0.05", 16), now - 2 - startTime);
      const newOriginationFee = newOriginationRate.mul(lendAmount).div(one);
      await expect(pool.connect(borrower).repayAll()).to.emit(pool, "Repayed")
        .withArgs(lender1.address, dueOf.due, dueOf.spreadFee, newOriginationFee, dueOf.penalty)

    })
  })
});

async function calcSupplyIndex(pool: Pool, priorIndex: BigNumberish, deltaTime: BigNumberish) {
  const interestRate = calcAnnualRate(await pool.rateMantissa(), deltaTime)

  const supplyIndex = interestRate
    .mul(priorIndex) //
    .div(parseUnit('1')) //
    .add(priorIndex) //
  return supplyIndex
}

function calcAnnualRate(mantissa: BigNumber, timeDelta: BigNumberish) {
  return mantissa.mul(timeDelta).div(year)
}

function calculateInterest(interest: BigNumberish, currentDelta: BigNumberish, startDelta: BigNumberish) {
  return BigNumber.from(interest).mul(currentDelta).div(startDelta);
}

async function calcPenaltyIndex(
  pool: Pool,
  priorIndex: BigNumberish,
  deltaTime: BigNumberish,
) {
  let penaltyRate = await pool.penaltyRate(deltaTime)
  return penaltyRate.mul(priorIndex).div(one).add(priorIndex)
}

function cloneAddressArray(address: string, count: number) {
  let addressArr = []

  for (let i = 0; i < count; i++) {
    addressArr.push(address)
  }
  return encodeAddressArray(addressArr)
}

async function runRepayTo(
  pool: Pool,
  signer: SignerWithAddress,
  lender: SignerWithAddress,
  expectedDue?: BigNumber,
) {

  const connectedToken = (await ethers.getContractAt(
    'StableCoin',
    await pool.asset(),
    signer,
  )) as StableCoin

  /// making a snapshot to calculate totalDue at the moment of repayment
  const snapshot = (await ethers.provider.send('evm_snapshot', [])) as BigNumber
  await time.increase(3);
  const due = await pool.dueOf(lender.address)
  const toPay = due.due.add(due.spreadFee).add(due.originationFee)
  await ethers.provider.send('evm_revert', [snapshot]);

  await connectedToken.mint(signer.address, toPay)
  await connectedToken.approve(pool.address, toPay)

  if (!expectedDue) {
    const connectedOrder = pool.connect(signer)
    await connectedOrder.repay(lender.address)
  } else {
    await expect(() => pool.connect(signer).repay(lender.address)).to.changeTokenBalance(
      connectedToken,
      signer,
      BigNumber.from(0).sub(expectedDue),
    )
  }
}

async function runRepayInterest(pool: Pool, borrower: SignerWithAddress, expectedDue?: BigNumber) {
  const connectedToken = (await ethers.getContractAt(
    'StableCoin',
    await pool.asset(),
    borrower,
  )) as StableCoin

  /// making a snapshot to calculate totalDue at the moment of repayment
  const snapshot = (await ethers.provider.send('evm_snapshot', [])) as BigNumber
  await time.increase(3);
  const dueInterestOf = await pool.totalDueInterest();
  await ethers.provider.send('evm_revert', [snapshot]);

  await connectedToken.mint(borrower.address, dueInterestOf)
  await connectedToken.approve(pool.address, dueInterestOf)

  if (expectedDue) {
    expect(dueInterestOf).to.eq(expectedDue)
  }

  await expect(pool.connect(borrower).repayInterest()).to.changeTokenBalance(
    connectedToken,
    borrower,
    BigNumber.from(0).sub(dueInterestOf),
  )
  return dueInterestOf
}

async function runRepayAll(pool: Pool, signer: SignerWithAddress, expectedTotalDue?: BigNumber) {
  const connectedToken = (await ethers.getContractAt(
    'StableCoin',
    await pool.asset(),
    signer,
  )) as StableCoin

  /// making a snapshot to calculate totalDue at the moment of repayment
  const snapshot = (await ethers.provider.send('evm_snapshot', [])) as BigNumber
  await time.increase(3);
  const totalDue = await pool.totalDue()
  await ethers.provider.send('evm_revert', [snapshot]);


  await connectedToken.mint(signer.address, totalDue)
  await connectedToken.approve(pool.address, totalDue)

  if (expectedTotalDue) {
    expect(totalDue).to.eq(expectedTotalDue)
  }

  await expect(() => pool.connect(signer).repayAll()).to.changeTokenBalance(
    connectedToken,
    signer,
    BigNumber.from(0).sub(totalDue),
  )
  return totalDue
}

async function timeToRoll(pool: Pool) {
  await time.increaseTo((await pool.maturityDate()).sub(day * 2 + 3))
}