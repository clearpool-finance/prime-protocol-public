import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'

import { constants, day, one, parseUnit } from '../utils'
import { deployPoolFactoryandBeacon, deployPrimeContract } from './_fixtures'
import { ethers, upgrades } from 'hardhat'

describe('Prime', () => {
  describe('Constructor', () => {
    it('Should set props through constructor', async () => {
      const { prime_instance, root, stableCoin, treasuryAddr, penaltyRatePerYear } = await loadFixture(
        deployPrimeContract,
      )

      expect(await prime_instance.owner()).to.equal(root.address)

      let availableAssets = await prime_instance.availableAssets()
      for (let i = 0; i < availableAssets.length; i++) {
        expect(availableAssets[i].toLowerCase()).to.equal(
          constants.defaultAssets[i] || stableCoin.address.toLowerCase(),
        )
      }

      expect(await prime_instance.spreadRate()).to.eq(0)
      expect(await prime_instance.penaltyRatePerYear()).to.eq(penaltyRatePerYear);
      expect(await prime_instance.treasury()).to.eq(treasuryAddr.address)
      expect(await prime_instance.isAssetAvailable(stableCoin.address)).to.be.equal(true);
      expect(await prime_instance.YEAR()).to.be.equal(360 * day);
    })
    it('Should not initialize with 1001% penalty rate', async () => {
      const { stableCoin, treasuryAddr } = await loadFixture(deployPrimeContract)

      const Prime_Factory = await ethers.getContractFactory('Prime')

      await expect(
        upgrades.deployProxy(
          Prime_Factory,
          [
            [...constants.defaultAssets, stableCoin.address, stableCoin.address], // assets array
            treasuryAddr.address, // treasury address
            parseUnit('11'), // penalty rate per year
          ],
          { initializer: '__Prime_init' },
        ),
      ).to.be.revertedWith('PRI')
    })
    it('Should not set same asset twice', async () => {
      const { stableCoin, treasuryAddr, penaltyRatePerYear } = await loadFixture(deployPrimeContract)

      const Prime_Factory = await ethers.getContractFactory('Prime')

      await expect(
        upgrades.deployProxy(
          Prime_Factory,
          [
            [...constants.defaultAssets, stableCoin.address, stableCoin.address], // assets array
            treasuryAddr.address, // treasury address
            penaltyRatePerYear, // penalty rate per year
          ],
          { initializer: '__Prime_init' },
        ),
      ).to.be.revertedWith('TIF')
    })
  })

  describe('requestMembership()', () => {
    it('should fail because of existing member', async () => {
      const { prime_instance, lender3 } = await loadFixture(deployPrimeContract)

      await prime_instance.whitelistMember(lender3.address, 1);
      await expect(prime_instance.requestMembership(lender3.address)).to.be.revertedWith('MAC');

    })
    it('should create a member instance', async () => {
      const { prime_instance, lender3 } = await loadFixture(deployPrimeContract)

      await prime_instance.requestMembership(lender3.address);

      const membership = await prime_instance.membershipOf(lender3.address);

      expect(membership.riskScore).to.equal(0);
      expect(membership.status).to.equal(0);
      expect(membership.created).to.be.true;
    })
  })

  describe('whitelistMember()', () => {
    it('should fail because of wrong owner', async () => {
      const { prime_instance, root, lender3, treasuryAddr } = await loadFixture(deployPrimeContract)

      expect(await prime_instance.owner()).to.equal(root.address)
      await expect(
        prime_instance.connect(treasuryAddr).whitelistMember(lender3.address, 1),
      ).to.be.revertedWith(constants.ownerInvalidErr)
    })
    it('should not whitelist zero address', async () => {
      const { prime_instance } = await loadFixture(deployPrimeContract)

      await expect(prime_instance.whitelistMember(constants.zeroAddress, 1)).to.be.revertedWith(
        'NZA',
      )
    })
    it('should not whitelist if already whitelisted', async () => {
      const { prime_instance, lender3 } = await loadFixture(deployPrimeContract)

      await prime_instance.whitelistMember(lender3.address, 15)

      await expect(prime_instance.whitelistMember(lender3.address, 15)).to.be.revertedWith('AAD')
    })
    it('should not whitelist if riskScore is not in range', async () => {
      const { prime_instance, lender3 } = await loadFixture(deployPrimeContract)

      await expect(prime_instance.whitelistMember(lender3.address, 101)).to.be.revertedWith('RSI')

      await expect(prime_instance.whitelistMember(lender3.address, 0)).to.be.revertedWith('RSI')

      await expect(prime_instance.whitelistMember(lender3.address, 10)).to.be.not.reverted
    })

    it('should whitelist member and set riskScore', async () => {
      const { prime_instance, lender3 } = await loadFixture(deployPrimeContract)

      await expect(prime_instance.whitelistMember(lender3.address, 15))
        .to.emit(prime_instance, 'MemberWhitelisted')
        .withArgs(lender3.address)
        .to.emit(prime_instance, 'RiskScoreChanged')
        .withArgs(lender3.address, 15)

      expect(await prime_instance.isMember(lender3.address)).to.be.true

      const membership = await prime_instance.membershipOf(lender3.address);

      expect(membership.riskScore).to.equal(15);
      expect(membership.status).to.equal(1);
      expect(membership.created).to.be.true;
    })
  })

  describe('isMember()', () => {
    it('should returns false', async () => {
      const { prime_instance, lender3 } = await loadFixture(deployPrimeContract)

      expect(await prime_instance.isMember(lender3.address)).to.be.false;
    })

    it('should returns true', async () => {
      const { prime_instance, lender3 } = await loadFixture(deployPrimeContract)

      await prime_instance.whitelistMember(lender3.address, 15);
      expect(await prime_instance.isMember(lender3.address)).to.be.true
    })
  })

  describe('isAssetAvailable()', () => {
    it('should returns false', async () => {
      const { prime_instance, stableCoin } = await loadFixture(deployPrimeContract)
      expect(await prime_instance.isAssetAvailable(stableCoin.address)).to.be.true;
    })

    it('should returns true', async () => {
      const { prime_instance, lender3 } = await loadFixture(deployPrimeContract)
      expect(await prime_instance.isAssetAvailable(lender3.address)).to.be.false
    })
  })

  describe('availableAssets()', () => {
    it('should returns the assets list', async () => {
      const { prime_instance, stableCoin } = await loadFixture(deployPrimeContract)
      expect((await prime_instance.availableAssets()).map(v => v.toLowerCase())).to.have.members([...constants.defaultAssets, stableCoin.address.toLowerCase()]);
    })
  })

  describe('blacklistMember()', () => {
    it('should fail because of wrong owner', async () => {
      const { prime_instance, borrower, treasuryAddr } = await loadFixture(
        deployPoolFactoryandBeacon,
      )

      await expect(
        prime_instance.connect(treasuryAddr).blacklistMember(borrower.address),
      ).to.be.revertedWith(constants.ownerInvalidErr)
    })
    it('should not blacklist zero address', async () => {
      const { prime_instance } = await loadFixture(deployPrimeContract)

      await expect(prime_instance.blacklistMember(constants.zeroAddress)).to.be.revertedWith('NZA')
    })
    it('should not blacklist if already blacklisted', async () => {
      const { prime_instance, borrower } = await loadFixture(deployPoolFactoryandBeacon)

      await prime_instance.blacklistMember(borrower.address)

      await expect(prime_instance.blacklistMember(borrower.address)).to.be.revertedWith('AAD')
    })
    it('should not blacklist if not whitelisted', async () => {
      const { prime_instance, lender3 } = await loadFixture(deployPrimeContract)

      await expect(prime_instance.blacklistMember(lender3.address)).to.be.revertedWith('NPM')
    })
    it('should blacklist Prime member', async () => {
      const { prime_instance, borrower } = await loadFixture(deployPoolFactoryandBeacon)

      await expect(prime_instance.blacklistMember(borrower.address))
        .to.emit(prime_instance, 'MemberBlacklisted')
        .withArgs(borrower.address)

      const membership = await prime_instance.membershipOf(borrower.address);
      expect(membership.status).to.equal(2);
    })
  })
  describe('changeMemberRiskScore()', () => {
    it('should fail because of wrong owner', async () => {
      const { prime_instance, lender3, treasuryAddr } = await loadFixture(deployPrimeContract)

      await prime_instance.whitelistMember(lender3.address, 99)

      await expect(
        prime_instance.connect(treasuryAddr).changeMemberRiskScore(lender3.address, 10),
      ).to.be.revertedWith(constants.ownerInvalidErr)
    })
    it('should not change risk score of zero address', async () => {
      const { prime_instance } = await loadFixture(deployPrimeContract)

      await expect(
        prime_instance.changeMemberRiskScore(constants.zeroAddress, 1),
      ).to.be.revertedWith('NZA')
    })
    it('should not change risk score if not whitelisted', async () => {
      const { prime_instance, lender3 } = await loadFixture(deployPrimeContract)

      await expect(prime_instance.changeMemberRiskScore(lender3.address, 15)).to.be.revertedWith(
        'NPM',
      )
    })
    it('should not change risk score if not in range', async () => {
      const { prime_instance, lender3 } = await loadFixture(deployPrimeContract)

      await prime_instance.whitelistMember(lender3.address, 15)

      await expect(prime_instance.changeMemberRiskScore(lender3.address, 101)).to.be.revertedWith(
        'RSI',
      )

      await expect(prime_instance.changeMemberRiskScore(lender3.address, 0)).to.be.revertedWith(
        'RSI',
      )

      await expect(prime_instance.changeMemberRiskScore(lender3.address, 10)).to.be.not.reverted
    })

    it('should not change risk score if same value provided', async () => {
      const { prime_instance, lender1 } = await loadFixture(deployPrimeContract)

      await prime_instance.whitelistMember(lender1.address, 99)
      await expect(prime_instance.changeMemberRiskScore(lender1.address, 99)).to.not.be.reverted;
    })

    it('should change risk score of Prime member', async () => {
      const { prime_instance, lender1 } = await loadFixture(deployPrimeContract)

      await prime_instance.whitelistMember(lender1.address, 99)

      await expect(prime_instance.changeMemberRiskScore(lender1.address, 15))
        .to.emit(prime_instance, 'RiskScoreChanged')
        .withArgs(lender1.address, 15)
    })
  })
  describe('changeSpreadRate()', () => {
    const spreadRate = parseUnit('0.1') // 10%
    it('should fail because of wrong owner', async () => {
      const { prime_instance, treasuryAddr } = await loadFixture(deployPrimeContract)

      await expect(
        prime_instance.connect(treasuryAddr).changeSpreadRate(spreadRate),
      ).to.be.revertedWith(constants.ownerInvalidErr)
    })

    it('should fail because of invalid rate range', async () => {
      const { prime_instance } = await loadFixture(deployPrimeContract)

      await expect(
        prime_instance.changeSpreadRate(parseUnit('2')), // 200%
      ).to.be.revertedWith('UTR')
    })

    it('should fail because of the same value set', async () => {
      const { prime_instance } = await loadFixture(deployPrimeContract)

      // set treasury address
      await prime_instance.changeSpreadRate(spreadRate)

      await expect(prime_instance.changeSpreadRate(spreadRate)).to.be.revertedWith('SVR')
    })

    it('should update spread rate', async () => {
      const { prime_instance } = await loadFixture(deployPrimeContract)

      await expect(prime_instance.changeSpreadRate(spreadRate))
        .to.emit(prime_instance, 'SpreadRateChanged')
        .withArgs(0, spreadRate.toString())

      expect(await prime_instance.spreadRate()).to.be.equal(spreadRate);
    })
  })

  describe('updatePenaltyRatePerYear()', async () => {
    it('should not change penalty rate', async () => {
      const { prime_instance } = await loadFixture(deployPrimeContract)

      const initialPenaltyRate = await prime_instance.penaltyRatePerYear()
      const newPenaltyRate = parseUnit('11')

      expect(initialPenaltyRate).to.not.eq(newPenaltyRate)

      await expect(prime_instance.updatePenaltyRatePerYear(newPenaltyRate))
        .to.be.revertedWith('PRI');
    })

    it('should fail because of wrong owner', async () => {
      const { prime_instance, treasuryAddr, penaltyRatePerYear } = await loadFixture(deployPrimeContract)

      await expect(
        prime_instance.connect(treasuryAddr).updatePenaltyRatePerYear(penaltyRatePerYear),
      ).to.be.revertedWith(constants.ownerInvalidErr)
    })

    it('should change penalty rate and emit event', async () => {
      const { prime_instance } = await loadFixture(deployPrimeContract)

      const initialPenaltyRate = await prime_instance.penaltyRatePerYear()
      const newPenaltyRate = parseUnit('1')

      expect(initialPenaltyRate).to.not.eq(newPenaltyRate)

      await expect(prime_instance.updatePenaltyRatePerYear(newPenaltyRate))
        .to.emit(prime_instance, 'PenaltyRatePerYearUpdated')
        .withArgs(initialPenaltyRate, newPenaltyRate)

      expect(await prime_instance.penaltyRatePerYear()).to.be.equal(newPenaltyRate);
    })
  })

  describe('setOriginationRate()', () => {
    it('should fail because of wrong owner', async () => {
      const { prime_instance, treasuryAddr } = await loadFixture(deployPrimeContract)

      await expect(prime_instance.connect(treasuryAddr).setOriginationRate(1)).to.be.revertedWith(
        constants.ownerInvalidErr,
      )
    })

    it('should fail because of invalid rate range', async () => {
      const { prime_instance } = await loadFixture(deployPrimeContract)

      await expect(prime_instance.setOriginationRate(one.add(1))).to.be.revertedWith('UTR')
    })

    it('should not set the same value', async () => {
      const { prime_instance } = await loadFixture(deployPrimeContract)

      const initialOriginationRate = await prime_instance.originationRate()

      await expect(prime_instance.setOriginationRate(initialOriginationRate)).to.be.revertedWith(
        'SVR',
      )
    })

    it('should emit event', async () => {
      const { prime_instance } = await loadFixture(deployPrimeContract)

      const initialOriginationRate = await prime_instance.originationRate()

      await expect(prime_instance.setOriginationRate(one))
        .to.emit(prime_instance, 'OriginationRateChanged')
        .withArgs(initialOriginationRate, one)

      expect(await prime_instance.originationRate()).to.be.equal(one);
    })
  })

  describe('setRollingIncrement()', () => {
    it('should fail because of wrong owner', async () => {
      const { prime_instance, treasuryAddr } = await loadFixture(deployPrimeContract)

      await expect(prime_instance.connect(treasuryAddr).setRollingIncrement(1)).to.be.revertedWith(
        constants.ownerInvalidErr,
      )
    })

    it('should fail because of invalid rate range', async () => {
      const { prime_instance } = await loadFixture(deployPrimeContract)

      await expect(prime_instance.setRollingIncrement(one.add(1))).to.be.revertedWith('UTR')
    })

    it('should not set the same value', async () => {
      const { prime_instance } = await loadFixture(deployPrimeContract)

      const initialRollingIncrement = await prime_instance.incrementPerRoll()

      await expect(prime_instance.setRollingIncrement(initialRollingIncrement)).to.be.revertedWith(
        'SVR',
      )
    })

    it('should emit event', async () => {
      const { prime_instance } = await loadFixture(deployPrimeContract)

      const initialRollingIncrement = await prime_instance.incrementPerRoll()

      await expect(prime_instance.setRollingIncrement(one))
        .to.emit(prime_instance, 'RollingIncrementChanged')
        .withArgs(initialRollingIncrement, one)

      expect(await prime_instance.incrementPerRoll()).to.be.equal(one);
    })
  })

  describe('setTreasury()', () => {
    it('should fail because of wrong owner', async () => {
      const { prime_instance, treasuryAddr } = await loadFixture(deployPrimeContract)

      await expect(
        prime_instance.connect(treasuryAddr).setTreasury(prime_instance.address),
      ).to.be.revertedWith(constants.ownerInvalidErr)
    })

    it('should fail because of zero address', async () => {
      const { prime_instance } = await loadFixture(deployPrimeContract)

      await expect(prime_instance.setTreasury(constants.zeroAddress)).to.be.revertedWith('NZA')
    })

    it('should fail because of the same value set', async () => {
      const { prime_instance, treasuryAddr } = await loadFixture(deployPrimeContract)

      await expect(prime_instance.setTreasury(treasuryAddr.address)).to.be.revertedWith('SVA')
    })

    it('should add protocol treasury address', async () => {
      const { prime_instance, treasuryAddr } = await loadFixture(deployPrimeContract)

      await expect(prime_instance.setTreasury(prime_instance.address))
        .to.emit(prime_instance, 'TreasuryChanged')
        .withArgs(treasuryAddr.address, prime_instance.address)

      expect(await prime_instance.treasury()).to.be.equal(prime_instance.address);
    })
  })

  describe('transferOwnership()', () => {
    it('should change the owner', async () => {
      const { prime_instance, root, lender1 } = await loadFixture(
        deployPrimeContract,
      )

      await expect(prime_instance.connect(root).transferOwnership(lender1.address))
        .to.emit(prime_instance, 'OwnershipTransferred')
        .withArgs(root.address, lender1.address)

      expect(await prime_instance.owner()).to.equal(lender1.address);
    })
  });
})
