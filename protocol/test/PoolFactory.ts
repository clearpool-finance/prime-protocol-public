import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { BigNumber, utils, Event } from 'ethers'
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';

import { constants, day, init } from '../utils'

import { deployPoolFactoryandBeacon } from './_fixtures'
import { Pool } from '../typechain-types'

describe('PoolFactory', function () {
  describe('Initialization', function () {
    it('Should be initialized', async () => {
      const { poolFactory, root } = await loadFixture(deployPoolFactoryandBeacon)
      await expect(poolFactory.__PoolFactory_init(root.address, root.address)).to.be.revertedWith(
        constants.contractInitializedErr,
      )
    })
    it('should set props through initializer', async () => {
      const { poolFactory, root, Pool_beacon, prime_instance } = await loadFixture(deployPoolFactoryandBeacon)

      expect(await poolFactory.owner()).to.equal(root.address)
      expect(await poolFactory.prime()).to.equal(prime_instance.address)
      expect(await poolFactory.poolBeacon()).to.equal(Pool_beacon.address)
    })
  })

  describe('Setters functions', function () {
    it('setPrimeContract()', async () => {
      const { poolFactory, root, lender1, prime_instance } = await loadFixture(
        deployPoolFactoryandBeacon,
      )

      await expect(
        poolFactory.connect(root).setPrimeContract(constants.zeroAddress),
      ).to.be.revertedWith('NZA')

      await expect(
        poolFactory.connect(lender1).setPrimeContract(lender1.address),
      ).to.be.revertedWith(constants.ownerInvalidErr)

      await expect(
        poolFactory.connect(root).setPrimeContract(prime_instance.address),
      ).to.be.revertedWith('SVA')

      await expect(poolFactory.connect(root).setPrimeContract(lender1.address))
        .to.emit(poolFactory, 'PrimeContractChanged')
        .withArgs(prime_instance.address, lender1.address)

      expect(await poolFactory.prime()).to.equal(lender1.address)
    })
    it('setPoolBeacon()', async () => {
      const { poolFactory, root, lender1, Pool_beacon } = await loadFixture(
        deployPoolFactoryandBeacon,
      )

      await expect(
        poolFactory.connect(root).setPoolBeacon(constants.zeroAddress),
      ).to.be.revertedWith('NZA')

      await expect(poolFactory.connect(root).setPoolBeacon(Pool_beacon.address)).to.be.revertedWith(
        'SVA',
      )

      await expect(poolFactory.connect(lender1).setPoolBeacon(lender1.address)).to.be.revertedWith(
        constants.ownerInvalidErr,
      )

      await expect(poolFactory.connect(root).setPoolBeacon(lender1.address))
        .to.emit(poolFactory, 'PoolBeaconChanged')
        .withArgs(Pool_beacon.address, lender1.address)

      expect(await poolFactory.poolBeacon()).to.equal(lender1.address);
    })
    it('transferOwnership()', async () => {
      const { poolFactory, root, lender1 } = await loadFixture(
        deployPoolFactoryandBeacon,
      )

      await expect(poolFactory.connect(lender1).setPoolBeacon(lender1.address)).to.be.revertedWith(
        constants.ownerInvalidErr,
      )

      await expect(poolFactory.connect(root).transferOwnership(lender1.address))
        .to.emit(poolFactory, 'OwnershipTransferred')
        .withArgs(root.address, lender1.address)

      expect(await poolFactory.owner()).to.equal(lender1.address);
    })
  })
  describe('Create Pool', function () {
    it('Should fail from non Prime member', async () => {
      const { poolFactory, root, createPoolDataProps, prime_instance } =
        await loadFixture(deployPoolFactoryandBeacon)

      await expect(poolFactory.connect(root).createPool(createPoolDataProps, [])).to.revertedWith(
        'NPM',
      )

      await prime_instance.whitelistMember(root.address, 10)

      await expect(poolFactory.connect(root).createPool(createPoolDataProps, [])).to.be.not.reverted
    })
    it('Should fail with non Prime members', async () => {
      const {
        poolFactory,
        borrower,
        createPoolValuesProps,
        createPoolDataProps,
        prime_instance,
        lender1,
        lender2,
      } = await loadFixture(deployPoolFactoryandBeacon)

      await expect(
        poolFactory
          .connect(borrower)
          .createPool(createPoolDataProps, createPoolValuesProps.members),
      ).to.be.revertedWith('NPM')

      await prime_instance.whitelistMember(lender1.address, 10)

      await expect(
        poolFactory
          .connect(borrower)
          .createPool(createPoolDataProps, createPoolValuesProps.members),
      ).to.be.revertedWith('NPM')

      await prime_instance.whitelistMember(lender2.address, 10)

      await expect(
        poolFactory
          .connect(borrower)
          .createPool(createPoolDataProps, createPoolValuesProps.members),
      ).to.be.not.reverted
    })
    it('Should fail with invalid asset', async () => {
      const { poolFactory, borrower, createPoolDataProps } =
        await loadFixture(deployPoolFactoryandBeacon)

      await expect(
        poolFactory.connect(borrower).createPool(
          {
            ...createPoolDataProps,
            asset: constants.zeroAddress,
          },
          [],
        ),
      ).to.be.revertedWith('NZA')

      await expect(poolFactory.connect(borrower).createPool(createPoolDataProps, [])).to.be.not
        .reverted
    })
    it('Should fail with 0 size', async () => {
      const { poolFactory, borrower, createPoolDataProps } =
        await loadFixture(deployPoolFactoryandBeacon)

      await expect(
        poolFactory.connect(borrower).createPool({ ...createPoolDataProps, size: 0 }, []),
      ).to.be.revertedWith('ZVL')

      await expect(poolFactory.connect(borrower).createPool(createPoolDataProps, [])).to.be.not
        .reverted
    })
    it('Should fail if deposit window < 1h', async () => {
      const { poolFactory, borrower, createPoolDataProps } =
        await loadFixture(deployPoolFactoryandBeacon)

      await expect(
        poolFactory.connect(borrower).createPool({ ...createPoolDataProps, depositWindow: 24 * 60 }, []),
      ).to.be.revertedWith('UTR')

      await expect(poolFactory.connect(borrower).createPool(createPoolDataProps, [])).to.be.not
        .reverted
    })
    it('Should if tenor <= deposit window', async () => {
      const { poolFactory, borrower, createPoolDataProps } =
        await loadFixture(deployPoolFactoryandBeacon)

      // tenor == deposit window
      await expect(
        poolFactory.connect(borrower).createPool(
          {
            ...createPoolDataProps,
            tenor: createPoolDataProps.depositWindow,
          },
          [],
        ),
      ).to.be.revertedWith('DET')

      // tenor < deposit window
      await expect(
        poolFactory.connect(borrower).createPool(
          {
            ...createPoolDataProps,
            tenor: (createPoolDataProps.depositWindow as BigNumber).sub(1),
            depositWindow: createPoolDataProps.depositWindow,
          },
          [],
        ),
      ).to.be.revertedWith('DET')

      await expect(poolFactory.connect(borrower).createPool(createPoolDataProps, [])).to.be.not
        .reverted
    })
    it('Should fail if tenor < 50 hours', async () => {
      const { poolFactory, borrower, createPoolDataProps } =
        await loadFixture(deployPoolFactoryandBeacon)

      // tenor < 50 hours
      await expect(
        poolFactory
          .connect(borrower)
          .createPool({ ...createPoolDataProps, tenor: 49 * 3600 }, []),
      ).to.be.revertedWith('DET')

      await expect(poolFactory.connect(borrower).createPool(createPoolDataProps, [])).to.be.not
        .reverted
    })
    it('Should fail if tenor < 65 days for monthly pool', async () => {
      const { poolFactory, borrower, createPoolDataProps } =
        await loadFixture(deployPoolFactoryandBeacon)

      // tenor < 65 days
      await expect(
        poolFactory
          .connect(borrower)
          .createPool({ ...createPoolDataProps, tenor: 64 * day, isBulletLoan: false }, []),
      ).to.be.revertedWith('TTS')

      await expect(poolFactory.connect(borrower).createPool({ ...createPoolDataProps, tenor: 65 * day, isBulletLoan: false }, [])).to.be.not
        .reverted
    })
    it('Should fail if asset is not available', async () => {
      const { poolFactory, borrower, createPoolDataProps, prime_instance } =
        await loadFixture(deployPoolFactoryandBeacon)

      await expect(
        poolFactory.connect(borrower).createPool(
          {
            ...createPoolDataProps,
            asset: prime_instance.address,
          },
          [],
        ),
      ).to.be.revertedWith('AAI')

      await expect(poolFactory.connect(borrower).createPool(createPoolDataProps, [])).to.be.not
        .reverted
    })
    it('Should create pool', async () => {
      const { poolFactory, borrower, prime_instance, createPoolDataProps } =
        await loadFixture(deployPoolFactoryandBeacon)

      await expect(
        poolFactory.connect(borrower).createPool(createPoolDataProps, [])
      ).to.emit(poolFactory, "PoolCreated").withArgs(
        anyValue,
        borrower.address,
        createPoolDataProps.isBulletLoan,
        createPoolDataProps.asset,
        createPoolDataProps.size,
        createPoolDataProps.rateMantissa,
        createPoolDataProps.tenor,
        createPoolDataProps.depositWindow,
        await prime_instance.spreadRate(),
        await prime_instance.originationRate(),
        await prime_instance.incrementPerRoll(),
        await prime_instance.penaltyRatePerYear(),
      )
    })
    it('Should create many pools', async () => {
      const { poolFactory, borrower, createPoolDataProps } =
        await loadFixture(deployPoolFactoryandBeacon)

      const poolCount = 2

      const pools = [];

      for (let i = 0; i < poolCount; i++) {
        let tx = await poolFactory.connect(borrower).createPool(createPoolDataProps, [])
        let { events } = await tx.wait();
        pools.push(((events as Event[])[2].args as utils.Result).pool)
      }
      expect(await poolFactory.getPools()).to.include.members(pools)
    })
  })

  describe('Default Pools', function () {
    it('defaultPools()', async () => {
      const { poolFactory, lender1, borrower, createPoolDataProps, Pool_beacon } = await loadFixture(
        deployPoolFactoryandBeacon,
      )

      await expect(
        poolFactory.connect(lender1).defaultPools([lender1.address])
      ).to.be.revertedWith(
        constants.ownerInvalidErr,
      )


      let tx = await poolFactory.connect(borrower).createPool(createPoolDataProps, [])
      let { events } = await tx.wait();

      const args = (events as Event[])[2].args as utils.Result;
      const newPoolContract = await init<Pool>("Pool", args.pool);

      await expect(
        poolFactory.defaultPools([newPoolContract.address])
      ).to.emit(newPoolContract, "Defaulted");
    })
  })
})
