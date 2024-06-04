import { BigInt, Bytes, Address, store, ethereum, log } from '@graphprotocol/graph-ts'
import { PoolCreated } from '../generated/PoolFactory/FactoryAbi'
import {
  Activated,
  CallbackCancelled,
  CallbackCreated,
  Closed,
  ConvertedToPublic,
  Defaulted,
  GracePeriodChanged,
  LenderBlacklisted,
  LenderWhitelisted,
  Lent,
  MonthlyRoundPeriodChanged,
  Repayed,
  RepayedInterest,
  RollAccepted,
  RollRangePeriodChanged,
  RollRejected,
  RollRequested,
} from '../generated/templates/Pool/PoolAbi'
import {
  Pool,
  PoolMember,
  Transaction,
  Roll,
  Callback,
  _Prime,
  Position,
  Repayment,
  RepaymentPayment,
} from '../generated/schema'
import { getOrCreatePrimeEntity } from './util'

let YEAR_SECONDS = BigInt.fromI32(360 * 24 * 60 * 60)
let MULTIPLIER = convertToBN(1, 18)

export function createNewPool(event: PoolCreated, poolIndex: BigInt): void {
  let pool = Pool.load(event.params.pool.toHex())

  if (pool == null) {
    pool = new Pool(event.params.pool.toHex())

    pool.asset = event.params.asset
    pool.index = poolIndex
    pool.repaymentPeriodIndex = BigInt.fromI32(1)
    pool.borrower = event.params.borrower
    pool.creator = event.params.borrower.toHex()
    pool.type = 'PUBLIC'
    pool.status = 'OPEN'
    pool.repaymentType = event.params.isBulletLoan ? 'BULLET' : 'MONTHLY'

    pool.size = event.params.size
    pool.filledSize = new BigInt(0)
    pool.currentSize = new BigInt(0)

    pool.rateMantissa = event.params.rateMantissa
    pool.spreadRate = event.params.spreadRate
    pool.originationRate = event.params.originationRate
    pool.penaltyRate = event.params.penaltyRatePerYear

    pool.tenor = event.params.tenor
    pool.maturityDate = new BigInt(0)
    pool.depositWindow = event.params.depositWindow
    pool.depositMaturity = new BigInt(0)

    pool.createdAt = event.block.timestamp
    pool.activeFrom = new BigInt(0)
    pool.lastPaidAt = new BigInt(0)

    pool.pendingRepaymentBlockAt = new BigInt(0)

    pool.closedAt = new BigInt(0)
    pool.defaultedAt = new BigInt(0)
    pool.totalDuePaid = new BigInt(0)
    pool.totalBorrowed = new BigInt(0)

    // config values
    pool.gracePeriod = BigInt.fromI32(3 * 24 * 60 * 60) // 3 days
    pool.monthlyRound = BigInt.fromI32(30 * 24 * 60 * 60) // 30 days
    pool.rollEndingRange = BigInt.fromI32(48 * 60 * 60) // 48 hours

    handleAddToPublicPool(event.params.pool)
    pool.members = handlePopulatePoolWithMembers(event.params.pool, event.params.borrower)
  }
  pool.save()
}

export function handleGracePeriodChange(event: GracePeriodChanged): void {
  let pool = Pool.load(event.address.toHex())

  if (pool != null) {
    pool.gracePeriod = event.params.newPeriod
    pool.save()
  }
}

export function handleMonthlyRoundPeriodChange(event: MonthlyRoundPeriodChanged): void {
  let pool = Pool.load(event.address.toHex())

  if (pool != null) {
    pool.monthlyRound = event.params.newPeriod
    pool.save()
  }
}

export function handleRollRangePeriodChange(event: RollRangePeriodChanged): void {
  let pool = Pool.load(event.address.toHex())

  if (pool != null) {
    pool.rollEndingRange = event.params.newPeriod
    pool.save()
  }
}

export function handleActivate(event: Activated): void {
  let pool = Pool.load(event.address.toHex())

  if (pool != null) {
    pool.status = 'ACTIVE'
    pool.activeFrom = event.block.timestamp
    pool.lastPaidAt = event.block.timestamp

    if (pool.repaymentType == 'MONTHLY') {

      let index = pool.repaymentPeriodIndex
      let startDate = event.block.timestamp
      let endDate = event.params.maturityDate

      while (startDate.le(event.params.maturityDate)) {
        let periodEnd = startDate.plus(pool.monthlyRound)
        if (periodEnd.lt(event.params.maturityDate)) {
          createRepayment(pool.id, index, startDate, periodEnd, pool.filledSize)
        } else {
          createRepayment(pool.id, index, startDate, endDate, pool.filledSize)
        }
        index = index.plus(BigInt.fromI32(1))
        startDate = periodEnd
      }
      pool.currentRepayment = createRepaymentId(pool.id, pool.repaymentPeriodIndex)
      pool.repaymentPeriodIndex = index
    }

    pool.depositMaturity = event.params.depositMaturity
    pool.maturityDate = event.params.maturityDate
    pool.save()
  }
}

export function handleSwitchVisibilityToPublic(event: ConvertedToPublic): void {
  let pool = Pool.load(event.address.toHex())

  if (pool != null) {
    pool.type = 'PUBLIC'
    let members = handlePopulatePoolWithMembers(
      event.address,
      Address.fromString(pool.borrower.toHex()),
    )

    if (pool.members.length > 0) {
      let filteredMembers = pool.members
      for (let i = 0; i < members.length; i++) {
        if (!filteredMembers.includes(members[i])) {
          filteredMembers.push(members[i])
        }
      }
      pool.members = filteredMembers
    } else {
      pool.members = members
    }

    pool.save()
  }
}

export function handleDefault(event: Defaulted): void {
  let pool = Pool.load(event.address.toHex())

  if (pool != null) {
    pool.status = 'DEFAULTED'
    pool.defaultedAt = event.block.timestamp
    // recalculate interest of positions? or just leave it as is?
    //TODO
    pool.save()
  }
}

export function handleClose(event: Closed): void {
  let pool = Pool.load(event.address.toHex())

  if (pool != null) {
    pool.status = 'CLOSED'
    pool.closedAt = event.block.timestamp
    pool.save()
  }
}

export function handleRollRequest(event: RollRequested): void {
  let pool = Pool.load(event.address.toHex())

  if (pool != null) {
    handleRollCreation(event, pool.maturityDate, pool.tenor)
    pool.currentRoll = event.params.rollId.toHex()
    pool.save()
  }
}

export function handleRollReject(event: RollRejected): void {
  let pool = Pool.load(event.address.toHex())

  if (pool != null) {
    pool.currentRoll = null
    pool.save()
    store.remove('Roll', event.params.rollId.toHex())
  }
}

export function handleRollAccept(event: RollAccepted): void {
  let pool = Pool.load(event.address.toHex())

  if (pool != null) {
    handleRollAccepted(event)
    if (pool.repaymentType == 'MONTHLY') {
      let index = pool.repaymentPeriodIndex
      let startDate = pool.maturityDate
      let endDate = pool.maturityDate.plus(pool.tenor)

      while (startDate.le(endDate)) {
        let periodEnd = startDate.plus(pool.monthlyRound)

        if (periodEnd.lt(endDate)) {
          createRepayment(pool.id, index, startDate, periodEnd, pool.filledSize)
        } else {
          createRepayment(pool.id, index, startDate, endDate, pool.filledSize)
        }
        index = index.plus(BigInt.fromI32(1))
        startDate = periodEnd
      }
      pool.repaymentPeriodIndex = index
    }
    pool.maturityDate = pool.maturityDate.plus(pool.tenor)
    handleRollPositions(
      createMemberId(event.address.toHex(), event.transaction.from.toHex()),
      pool.maturityDate,
    )
    pool.save()
  }
}

export function handleCallbackCreate(event: CallbackCreated): void {
  let callback = new Callback(event.transaction.hash.toHex())

  callback.pool = event.address.toHex()
  callback.lender = event.params.lender
  callback.timestamp = event.block.timestamp
  callback.paid = false
  callback.txHash = createTxId(event.transaction.hash.toHex(), event.transaction.index.toHex())

  let principal = getMemberPrincipal(event.address.toHex(), event.params.lender.toHex())

  handleTx(
    'CALLBACK',
    event.block.timestamp,
    event.transaction.hash,
    event.transaction.index,
    event.address.toHex(),
    event.params.lender,
    event.address,
    principal,
  )

  let poolMember = PoolMember.load(createMemberId(event.address.toHex(), event.params.lender.toHex()))
  if (poolMember != null) {
    let callbacks = poolMember.callbacks
    callbacks.push(event.transaction.hash.toHex())
    poolMember.callbacks = callbacks
    poolMember.save()
  }
  callback.save()
}

export function handleCallbackCancel(event: CallbackCancelled): void {
  let poolMember = PoolMember.load(
    createMemberId(event.address.toHex(), event.params.lender.toHex()),
  )
  if (poolMember != null) {
    let callbacks = poolMember.callbacks

    let callbackId = callbacks[callbacks.length - 1]

    let callbackItem = Callback.load(callbackId);
    if (callbackItem != null) {
      store.remove('Transaction', callbackItem.txHash)
    }
    store.remove('Callback', callbackId)

    callbacks.pop()
    poolMember.callbacks = callbacks
    poolMember.save()
  }
}

export function handleLenderWhitelist(event: LenderWhitelisted): void {
  let pool = Pool.load(event.address.toHex())

  if (pool != null) {
    if (pool.type == 'PUBLIC') {
      pool.type = 'PRIVATE'
      handleRemoveFromPublicPool(event.address)
      pool.members = []
    }

    handleMemberWhitelist(event)
    let currentMembers = pool.members
    let memberId = createMemberId(pool.id, event.params.lender.toHex())
    if (!currentMembers.includes(memberId)) {
      currentMembers.push(memberId)
      pool.members = currentMembers
    }
    pool.save()
  }
}

export function handleLenderBlacklist(event: LenderBlacklisted): void {
  let memberId = createMemberId(event.address.toHex(), event.params.lender.toHex())
  let member = PoolMember.load(memberId)

  if (member != null) {
    member.status = 'BLACKLISTED'
    member.save()
  }
}

export function handleLend(event: Lent): void {
  let pool = Pool.load(event.address.toHex())

  if (pool != null) {
    pool.currentSize = pool.currentSize.plus(event.params.amount)
    pool.filledSize = pool.filledSize.plus(event.params.amount)
    pool.totalBorrowed = pool.totalBorrowed.plus(event.params.amount)
    handleMemberLend(event)
    handleTx(
      'LEND',
      event.block.timestamp,
      event.transaction.hash,
      event.transaction.index,
      pool.id,
      event.params.lender,
      pool.borrower,
      event.params.amount,
    )

    if (pool.currentRepayment != null) {
      let repayment = Repayment.load(pool.currentRepayment as string);
      if (repayment != null) {
        repayment.size = repayment.size.plus(event.params.amount)
        repayment.save()
      }
    }
    pool.save()
  }
}

export function handleRepay(event: Repayed): void {
  let pool = Pool.load(event.address.toHex())

  if (pool != null) {
    let principal = getMemberPrincipal(pool.id, event.params.lender.toHex())

    pool.currentSize = pool.currentSize.minus(principal)
    if (pool.depositMaturity.gt(event.block.timestamp)) {
      pool.filledSize = pool.filledSize.minus(principal)

      if (pool.currentRepayment != null) {
        let repayment = Repayment.load(pool.currentRepayment as string);
        if (repayment != null) {
          repayment.size = repayment.size.minus(principal)
          repayment.save()
        }
      }
    }
    let totalPaid = event.params.repayed.plus(event.params.spreadFee).plus(event.params.originationFee)
    pool.totalDuePaid = pool.totalDuePaid.plus(totalPaid);

    if (pool.currentRoll != null) {
      let roll = Roll.load(pool.currentRoll as string)

      if (roll != null) {
        roll.paid = true
        roll.save()
      }
      pool.currentRoll = null
    }

    handleMemberRepay(event)
    handleTx(
      'REPAY',
      event.block.timestamp,
      event.transaction.hash,
      event.transaction.index,
      pool.id,
      pool.borrower,
      event.params.lender,
      event.params.repayed,
    )
    pool.save()
  }
}

export function handleRepayInterest(event: RepayedInterest): void {
  let pool = Pool.load(event.address.toHex())

  if (pool != null) {
    handleTx(
      'REPAY_INTEREST',
      event.block.timestamp,
      event.transaction.hash,
      event.transaction.index,
      pool.id,
      pool.borrower,
      event.params.lender,
      event.params.repayed,
    )

    if (pool.pendingRepaymentBlockAt.notEqual(event.block.timestamp)) {
      pool.pendingRepaymentBlockAt = event.block.timestamp
      if (pool.currentRepayment != null) {
        let repayment = Repayment.load(pool.currentRepayment as string);
        if (repayment != null) {
          repayment.paidAt = event.block.timestamp
          repayment.penalty = repayment.penalty.plus(event.params.penalty)
          repayment.repaid = repayment.repaid.plus(event.params.repayed).plus(event.params.spreadFee)
          let nextRepaymentId = createRepaymentId(pool.id, repayment.index.plus(BigInt.fromI32(1)))

          let nextRepayment = Repayment.load(nextRepaymentId);
          if (nextRepayment != null) {
            nextRepayment.size = repayment.size
            nextRepayment.save();
          }

          createOrUpdateRepaymentPayment<RepayedInterest>(repayment.id, event)
          pool.currentRepayment = nextRepaymentId
          repayment.save();
        }
      }

      if (pool.lastPaidAt.plus(pool.monthlyRound).gt(pool.maturityDate)) {
        pool.lastPaidAt = pool.maturityDate
      } else {
        pool.lastPaidAt = pool.lastPaidAt.plus(pool.monthlyRound)
      }
    } else {
      if (pool.currentRepayment != null) {
        let repayment = Repayment.load(pool.currentRepayment as string);
        if (repayment != null) {
          let previousRepayment = Repayment.load(createRepaymentId(pool.id, repayment.index.minus(BigInt.fromI32(1))))
          if (previousRepayment != null) {
            previousRepayment.penalty = previousRepayment.penalty.plus(event.params.penalty)
            previousRepayment.repaid = previousRepayment.repaid.plus(event.params.repayed).plus(event.params.spreadFee)

            createOrUpdateRepaymentPayment<RepayedInterest>(previousRepayment.id, event)
            previousRepayment.save()
          }
        }
      }
    }
    handleMemberRepayInterest(event, pool.lastPaidAt)
    let totalPaid = event.params.repayed.plus(event.params.spreadFee)
    pool.totalDuePaid = pool.totalDuePaid.plus(totalPaid)
    pool.save()
  }
}

function handleRollCreation(event: RollRequested, startDate: BigInt, tenor: BigInt): void {
  let roll = new Roll(event.params.rollId.toHex())

  roll.startDate = startDate
  roll.endDate = startDate.plus(tenor)
  roll.pool = event.address.toHex()
  roll.createdAt = event.block.timestamp

  roll.accepted = false
  roll.paid = false

  roll.save()
}

function handleRollAccepted(event: RollAccepted): void {
  let roll = Roll.load(event.params.rollId.toHex())
  if (roll != null) {
    roll.accepted = true
    roll.save()
  }
}

function handleMemberWhitelist(event: LenderWhitelisted): void {
  let memberId = createMemberId(event.address.toHex(), event.params.lender.toHex())
  createPoolMember(memberId, event.params.lender, 'WHITELISTED');
}

function handleMemberLend(event: Lent): void {
  let memberId = createMemberId(event.address.toHex(), event.params.lender.toHex())
  let member = PoolMember.load(memberId)
  if (member != null) {
    member.principal = member.principal.plus(event.params.amount)
    member.positionAmount = member.positionAmount.plus(event.params.amount)

    let memberPositions = member.positions
    let positionId = createPositionId(
      event.address.toHex(),
      event.params.lender.toHex(),
      memberPositions.length,
    )
    let position = new Position(positionId)

    position.amount = event.params.amount
    position.lender = event.params.lender
    position.timestamp = event.block.timestamp
    position.paid = false
    position.penalty = new BigInt(0)
    position.interestRepaid = new BigInt(0)
    position.spreadRepaid = new BigInt(0)
    position.txHash = event.transaction.hash.toHex()

    let pool = Pool.load(event.address.toHex())

    if (pool != null) {
      position.pool = pool.id
      position.interest = calcInterest(
        event.params.amount,
        pool.rateMantissa,
        event.block.timestamp,
        pool.maturityDate,
      )
      position.endAt = pool.maturityDate
    }
    position.save()

    memberPositions.push(positionId)
    member.positions = memberPositions

    let txs = member.transactions
    txs.push(createTxId(event.transaction.hash.toHex(), event.transaction.index.toHex()))
    member.transactions = txs

    member.save()
  }
}

function handleMemberRepay(event: Repayed): void {
  let memberId = createMemberId(event.address.toHex(), event.params.lender.toHex())
  let member = PoolMember.load(memberId)

  if (member != null) {
    // update persisting amounts
    let interest = event.params.repayed.minus(member.principal)

    member.accrued = member.accrued.plus(interest).minus(event.params.penalty)
    member.interestRepaid = member.interestRepaid.plus(interest).minus(event.params.penalty)
    member.penalty = member.penalty.plus(event.params.penalty)
    member.spreadFeeAmount = member.spreadFeeAmount.plus(event.params.spreadFee)
    member.originationFeeAmount = member.originationFeeAmount.plus(event.params.originationFee)
    member.totalDue = member.totalDue.plus(event.params.repayed)

    member.principal = new BigInt(0)

    // add penalty to the last repayment if exists
    let pool = Pool.load(event.address.toHex());
    if (pool != null && pool.repaymentType == 'MONTHLY') {
      let repayment = Repayment.load(createRepaymentId(pool.id, pool.repaymentPeriodIndex.minus(BigInt.fromI32(1))));
      if (repayment != null) {
        createOrUpdateRepaymentPayment<Repayed>(repayment.id, event)
        repayment.penalty = repayment.penalty.plus(event.params.penalty);
        repayment.repaid = repayment.repaid.plus(event.params.repayed).plus(event.params.spreadFee)
        repayment.save();
      }
    }

    let hasRequestedCallback = false
    if (member.callbacks.length > 0) {
      let callback = member.callbacks[member.callbacks.length - 1]
      let clbkI = Callback.load(callback)
      if (clbkI != null && !clbkI.paid) {
        clbkI.paid = true
        hasRequestedCallback = true
        clbkI.save()
      }
    }

    let memberPositions = member.positions
    for (let i = 0; i < memberPositions.length; i++) {
      let position = Position.load(memberPositions[i])

      if (position != null && !position.paid) {
        let penalty = new BigInt(0);
        let pool = Pool.load(event.address.toHex());

        if (pool != null) {
          // maturity penalty
          let maturityDate = event.block.timestamp.gt(position.endAt) ? event.block.timestamp : position.endAt
          penalty = calcInterest(position.amount, pool.penaltyRate, position.endAt, maturityDate)

          if (position.timestamp.gt(member.lastPaidAt)) {
            if (hasRequestedCallback) {
              position.interestRepaid = position.interestRepaid.plus(
                calcInterest(position.amount, pool.rateMantissa, position.timestamp, event.block.timestamp)
              )
            } else {
              position.interestRepaid = position.interestRepaid.plus(
                calcInterest(position.amount, pool.rateMantissa, position.timestamp, maturityDate)
              )
            }
          } else {
            if (hasRequestedCallback) {
              if (member.lastPaidAt.ge(event.block.timestamp)) {
                position.interestRepaid = position.interestRepaid
              } else {
                position.interestRepaid = position.interestRepaid.plus(
                  calcInterest(position.amount, pool.rateMantissa, member.lastPaidAt, event.block.timestamp)
                )
              }
            } else {
              position.interestRepaid = position.interestRepaid.plus(
                calcInterest(position.amount, pool.rateMantissa, member.lastPaidAt, maturityDate)
              )
            }
          }

          // repayment penalty
          if (pool.repaymentType == "MONTHLY") {
            let repayment = Repayment.load(pool.currentRepayment as string)

            if (repayment) {
              if (event.block.timestamp.gt(repayment.endDate)) {
                penalty = penalty.plus(calcInterest(position.amount, pool.penaltyRate, repayment.endDate, event.block.timestamp))
              }
            }
          }

          position.spreadRepaid = calcFeeFromInterest(position.interestRepaid, pool.spreadRate)
        }
        position.paid = true
        position.penalty = position.penalty.plus(penalty)
        position.paidAt = event.block.timestamp
        position.save()
      }
    }

    let txs = member.transactions
    txs.push(createTxId(event.transaction.hash.toHex(), event.transaction.index.toHex()))
    member.transactions = txs
    member.lastPaidAt = event.block.timestamp

    member.save()
  }
}

function handleMemberRepayInterest(event: RepayedInterest, lastPaidAt: BigInt): void {
  let memberId = createMemberId(event.address.toHex(), event.params.lender.toHex())
  let member = PoolMember.load(memberId)

  if (member != null) {

    let txs = member.transactions
    txs.push(createTxId(event.transaction.hash.toHex(), event.transaction.index.toHex()))
    member.transactions = txs
    let lastPaymentAt = member.lastPaidAt
    member.lastPaidAt = lastPaidAt

    // update persisting amounts
    member.accrued = member.accrued.plus(event.params.repayed).minus(event.params.penalty)
    member.penalty = member.penalty.plus(event.params.penalty)
    member.spreadFeeAmount = member.spreadFeeAmount.plus(event.params.spreadFee)
    member.interestRepaid = member.interestRepaid.plus(event.params.repayed).minus(event.params.penalty)
    member.totalDue = member.totalDue.plus(event.params.repayed)

    let memberPositions = member.positions
    for (let i = 0; i < memberPositions.length; i++) {
      let position = Position.load(memberPositions[i])

      if (position != null && !position.paid) {
        let penalty = new BigInt(0);
        let pool = Pool.load(event.address.toHex());
        if (pool != null) {
          let repaymentMaturity = event.block.timestamp.gt(lastPaidAt) ? event.block.timestamp : lastPaidAt;
          penalty = calcInterest(position.amount, pool.penaltyRate, lastPaidAt, repaymentMaturity)

          if (position.timestamp.gt(lastPaymentAt)) {
            position.interestRepaid = position.interestRepaid.plus(calcInterest(position.amount, pool.rateMantissa, position.timestamp, repaymentMaturity))
          } else {
            position.interestRepaid = position.interestRepaid.plus(calcInterest(position.amount, pool.rateMantissa, lastPaymentAt, repaymentMaturity))
          }
          position.spreadRepaid = calcFeeFromInterest(position.interestRepaid, pool.spreadRate)
        }
        position.penalty = position.penalty.plus(penalty)
        position.save()
      }
    }

    member.save()
  }
}

function handleTx(
  txType: string,
  timestamp: BigInt,
  txHash: Bytes,
  index: BigInt,
  pool: string,
  from: Bytes,
  to: Bytes,
  amount: BigInt,
): void {
  let txId = createTxId(txHash.toHex(), index.toHex())
  let tx = new Transaction(txId)

  tx.createdAt = timestamp
  tx.from = from
  tx.to = to
  tx.hash = txHash.toHex()
  tx.pool = pool
  tx.amount = amount
  tx.type = txType

  tx.save()
}

function getMemberPrincipal(pool: string, lender: string): BigInt {
  let amount = new BigInt(0)

  let memberId = createMemberId(pool, lender)
  let member = PoolMember.load(memberId)

  if (member != null) {
    amount = member.principal
  }
  return amount
}

function handleAddToPublicPool(pool: Address): void {
  let instance = _Prime.load('clearpool')

  if (instance != null) {
    let currentPools = instance.publicPools
    currentPools.push(pool.toHex())
    instance.publicPools = currentPools
    instance.save()
  }
}

function handleRemoveFromPublicPool(pool: Address): void {
  let instance = _Prime.load('clearpool')

  if (instance != null) {
    let currentPools = instance.publicPools
    let index = 0
    for (let i = 0; i < currentPools.length; i++) {
      if (currentPools[i].includes(pool.toHex())) {
        index = i
        break
      }
    }
    currentPools.splice(index, 1)
    instance.publicPools = currentPools
    instance.save()
  }
}

function handleRollPositions(memberId: string, newMaturity: BigInt): void {
  let poolMember = PoolMember.load(memberId)
  if (poolMember != null) {
    let positions = poolMember.positions
    for (let i = 0; i < positions.length; i++) {
      let position = Position.load(positions[i])
      if (position != null) {
        let pool = Pool.load(position.pool)
        if (pool != null) {
          let interest = calcInterest(position.amount, pool.rateMantissa, position.endAt, newMaturity)
          position.interest = position.interest.plus(interest)
          position.endAt = newMaturity
          position.save()
        }
      }
    }
  }
}
export function handleAddPrimeMember(memberId: Bytes): void {
  let instance = getOrCreatePrimeEntity()

  let currentMembers = instance.members
  let currentPools = instance.publicPools
  currentMembers.push(memberId.toHex())
  instance.members = currentMembers

  for (let i = 0; i < currentPools.length; i++) {
    let poolId = currentPools[i]
    let pool = Pool.load(poolId)

    if (pool != null) {
      let poolMembers = pool.members
      for (let j = 0; j < currentMembers.length; j++) {
        let memberId = createMemberId(poolId, currentMembers[j])

        if (
          !pool.members.includes(memberId) &&
          !pool.borrower.equals(Address.fromString(currentMembers[j]))
        ) {
          createPoolMember(memberId, Address.fromString(currentMembers[j]), 'WHITELISTED');
          poolMembers.push(memberId)
        }
      }
      pool.members = poolMembers
      pool.save()
    }
  }

  instance.save()
}

export function handleRemovePrimeMember(memberId: Bytes): void {
  let instance = getOrCreatePrimeEntity()

  let currentMembers = instance.members
  let currentPools = instance.publicPools
  let index = 0
  for (let i = 0; i < currentMembers.length; i++) {
    if (currentMembers[i].includes(memberId.toHex())) {
      index = i
      break
    }
  }

  for (let i = 0; i < currentPools.length; i++) {
    let poolId = currentPools[i]
    let pool = Pool.load(poolId)

    if (pool != null) {
      let poolMembers = pool.members
      for (let j = 0; j < currentMembers.length; j++) {
        let memberId = createMemberId(poolId, currentMembers[j])
        if (pool.members.includes(memberId)) {
          let index = pool.members.indexOf(memberId);

          poolMembers.splice(index, 1)
          store.remove('PoolMember', memberId);
        }
      }
      pool.members = poolMembers
      pool.save()
    }
  }

  currentMembers.splice(index, 1)
  instance.members = currentMembers
  instance.save()
}

function createPoolMember(memberId: string, poolMember: Address, status: string): void {
  let member = PoolMember.load(memberId)
  if (member == null) {
    member = new PoolMember(memberId)

    member.address = poolMember
    member.primeRef = poolMember.toHex()
    member.principal = new BigInt(0)
    member.lastPaidAt = new BigInt(0)
    member.positions = []
    member.transactions = []
    member.callbacks = []
    member.pool = parseMemberId(memberId)[0]

    // persist amounts history
    member.positionAmount = new BigInt(0)
    member.accrued = new BigInt(0)
    member.originationFeeAmount = new BigInt(0)
    member.spreadFeeAmount = new BigInt(0)
    member.penalty = new BigInt(0)
    member.interestRepaid = new BigInt(0)
    member.totalDue = new BigInt(0)
  }
  member.status = status
  member.save()
}

function createOrUpdateRepaymentPayment<T>(repaymentId: string, event: T): void {
  let id = createRepaymentPaymentId(repaymentId, event.params.lender.toHex());
  let payment = RepaymentPayment.load(id)
  if (payment == null) {
    payment = new RepaymentPayment(id);

    payment.repayment = repaymentId

    payment.lender = event.params.lender
    payment.amount = event.params.repayed
    payment.penalty = event.params.penalty
    payment.spread = event.params.spreadFee
  } else {
    payment.amount = payment.amount.plus(event.params.repayed)
    payment.penalty = payment.penalty.plus(event.params.penalty)
    payment.spread = payment.spread.plus(event.params.spreadFee)
  }
  payment.save();
}

function handlePopulatePoolWithMembers(pool: Address, poolCreator: Address): string[] {
  let instance = _Prime.load('clearpool')

  let poolMembers: string[] = []
  if (instance != null) {
    let instanceMembers = instance.members
    for (let i = 0; i < instanceMembers.length; i++) {
      // Ignore pool creator as member
      if (!poolCreator.equals(Address.fromString(instanceMembers[i]))) {
        let memberId = createMemberId(pool.toHex(), instanceMembers[i])
        createPoolMember(memberId, Address.fromString(instanceMembers[i]), 'WHITELISTED');
        poolMembers.push(memberId)
      }
    }
    instance.save()
  }
  return poolMembers
}

function createRepayment(pool: string, index: BigInt, startDate: BigInt, endDate: BigInt, size: BigInt): void {
  let repayment = new Repayment(createRepaymentId(pool, index));

  repayment.pool = pool
  repayment.index = index
  repayment.startDate = startDate
  repayment.endDate = endDate
  repayment.paidAt = new BigInt(0)
  repayment.penalty = new BigInt(0)
  repayment.repaid = new BigInt(0)
  repayment.size = size

  repayment.save();
}

function calcInterest(amount: BigInt, rate: BigInt, startDate: BigInt, endDate: BigInt): BigInt {
  let anualRate = rate.times(endDate.minus(startDate)).div(YEAR_SECONDS)
  return amount.times(anualRate).div(MULTIPLIER)
}

function calcFeeFromInterest(interest: BigInt, feeRate: BigInt): BigInt {
  return interest.times(feeRate).div(MULTIPLIER)
}

function convertToBN(amount: i32, base: u8): BigInt {
  let unit = BigInt.fromI32(10).pow(base)
  return BigInt.fromI32(amount).times(unit)
}

function createMemberId(pool: string, memberId: string): string {
  return pool.concat(memberId)
}

function createRepaymentPaymentId(repaymentId: string, memberId: string): string {
  return repaymentId.concat(memberId)
}

function parseMemberId(memberId: string): string[] {
  const poolAddr = memberId.substring(0, 42); // Extract first 42 characters
  const memberAddr = memberId.substring(42); // Extract remaining characters
  return [poolAddr, memberAddr]
}

function createRepaymentId(pool: string, index: BigInt): string {
  return pool.concat('-').concat(index.toString())
}

function createTxId(hash: string, index: string): string {
  return hash.concat('@').concat(index)
}

function createPositionId(pool: string, lender: string, index: number): string {
  return pool
    .concat('-')
    .concat(lender)
    .concat('-')
    .concat(index.toString())
}