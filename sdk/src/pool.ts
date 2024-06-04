import { BigNumber, ethers, ContractTransaction, BigNumberish, providers } from 'ethers'
import { type CallInput } from '@indexed-finance/multicall'
import type { IPool, Pool, ERC20, IMulticall3 } from '../protocol/typechain-types'
import type { PoolFactory } from '../protocol/typechain-types/contracts/Pool/PoolFactory'
import {
  bindNetId,
  initContract,
  isAddress,
  isBigNumber,
  encodeAddressArray,
  toWei,
  toBN,
  isBoolean,
  getEncodedFunctionData,
  getDecodedResult,
} from './helpers'
import { coins, config } from './constants'
import { Zero } from '@ethersproject/constants'

const YEAR = 360 * 86400

const One = ethers.utils.parseUnits('1')

export type DueInterest<T> = {
  dueInterest?: T
  dueInterestWithoutSpread?: T
  interestPenalty?: T
  spreadOnInterest?: T
}

export type Due<T> = DueInterest<T> & {
  due: T
  dueWithoutSpread: T
  spread: T
  originationFee?: T
  penalty: T
}

export type MemberAmounts<T> = Due<T> & {
  balance: T
  accrued?: T
}

export type lenderPositionsAmountsByPoolInput = {
  poolInfo: {
    repaymentType: RepaymentType
    penaltyRate: string,
    rateMantissa: string
    spreadRate: string
    originationRate?: string
    maturityDate: number
    lastPaidAt?: number
    monthlyRound: number
  }
  lenderInfo: {
    lastPaidAt: number
    positions: Array<Position>
    address?: string
    activeCallback?: Callback
  }
  currentTs: number
}

export enum RepaymentType {
  MONTHLY = 'MONTHLY',
  BULLET = 'BULLET',
}

export type Position = {
  id: string
  amount: string
  interest: string
  timestamp: string
  endAt: string
  paidAt?: string
  paid: Boolean
}

export type Callback = {
  id: string
  paid: Boolean
}

/**
 * Creates a new pool.
 *
 * @dev If `members` is empty, the pool will be public, otherwise it will be private.
 *
 * @param data - minimal data to create a pool
 * @param members - array of addresses to whitelist.
 * @returns - ContractTransaction object
 */
export async function createPool(
  data: Record<keyof IPool.PoolDataStructOutput, any>,
  members: string[] = [],
): Promise<ContractTransaction> {
  await bindNetId(this)

  isAddress(data.asset as string)
  isBoolean(data.isBulletLoan)
  isBigNumber(data.size)
  isBigNumber(data.rateMantissa)
  isBigNumber(data.tenor)
  isBigNumber(data.depositWindow)

  const stablecoin = coins(data.asset as string, this._network.id)
  data.size = ethers.utils.parseUnits(toBN(data.size, stablecoin.decimals), stablecoin.decimals)
  data.rateMantissa = ethers.utils.parseUnits(toBN(data.rateMantissa, 16), 16) // percents;

  let contract = initContract<PoolFactory>(
    this.addresses.PoolFactory,
    config.abi.PoolFactory,
    this._provider,
  )
  return contract.createPool(data, ethers.utils.arrayify(encodeAddressArray(members)))
}

/**
 * Closes a pool.
 *
 * @param pool - pool address
 * @returns ContractTransaction object
 */
export async function closePool(pool: string): Promise<ContractTransaction> {
  await bindNetId(this)

  isAddress(pool)
  return initContract<Pool>(pool, config.abi.Pool, this._provider).close()
}

export async function whitelistLenders(
  pool: string,
  members: string[] = [],
): Promise<ContractTransaction> {
  await bindNetId(this)

  isAddress(pool)

  const contract = initContract<Pool>(pool, config.abi.Pool, this._provider)
  return contract.whitelistLenders(ethers.utils.arrayify(encodeAddressArray(members)))
}

export async function blacklistLenders(
  pool: string,
  members: string[] = [],
): Promise<ContractTransaction> {
  await bindNetId(this)

  isAddress(pool)

  const contract = initContract<Pool>(pool, config.abi.Pool, this._provider)
  return contract.blacklistLenders(ethers.utils.arrayify(encodeAddressArray(members)))
}

export async function switchToPublic(pool: string): Promise<ContractTransaction> {
  await bindNetId(this)

  isAddress(pool)
  return initContract<Pool>(pool, config.abi.Pool, this._provider).switchToPublic()
}

export async function lend(
  asset: string,
  pool: string,
  amount: string | number | BigNumber,
): Promise<ContractTransaction> {
  await bindNetId(this)

  isAddress(asset)
  isAddress(pool)
  isBigNumber(amount)

  const stablecoin = coins(asset, this._network.id)

  amount = ethers.utils.parseUnits(amount.toString(), stablecoin.decimals)
  return initContract<Pool>(pool, config.abi.Pool, this._provider).lend(amount)
}

export async function repay(pool: string, lender: string): Promise<ContractTransaction> {
  await bindNetId(this)

  isAddress(lender)
  isAddress(pool)

  return initContract<Pool>(pool, config.abi.Pool, this._provider).repay(lender)
}

export async function repayAll(pool: string): Promise<ContractTransaction> {
  await bindNetId(this)

  isAddress(pool)
  return initContract<Pool>(pool, config.abi.Pool, this._provider).repayAll()
}

export async function repayInterest(pool: string) {
  await bindNetId(this)

  isAddress(pool)
  return initContract<Pool>(pool, config.abi.Pool, this._provider).repayInterest()
}

export async function requestCallBack(pool: string): Promise<ContractTransaction> {
  await bindNetId(this)

  isAddress(pool)
  return initContract<Pool>(pool, config.abi.Pool, this._provider).requestCallBack()
}

export async function cancelCallBack(pool: string): Promise<ContractTransaction> {
  await bindNetId(this)

  isAddress(pool)
  return initContract<Pool>(pool, config.abi.Pool, this._provider).cancelCallBack()
}

export async function requestRoll(pool: string): Promise<ContractTransaction> {
  await bindNetId(this)

  isAddress(pool)
  return initContract<Pool>(pool, config.abi.Pool, this._provider).requestRoll()
}

export async function acceptRoll(pool: string): Promise<ContractTransaction> {
  await bindNetId(this)

  isAddress(pool)
  return initContract<Pool>(pool, config.abi.Pool, this._provider).acceptRoll()
}

export async function markPoolDefaulted(pool: string): Promise<ContractTransaction> {
  await bindNetId(this)

  isAddress(pool)
  return initContract<Pool>(pool, config.abi.Pool, this._provider).markPoolDefaulted()
}

export async function close(pool: string): Promise<ContractTransaction> {
  await bindNetId(this)

  isAddress(pool)
  return initContract<Pool>(pool, config.abi.Pool, this._provider).close()
}

export async function approveTransfer(
  tokenAddr: string,
  spender: string,
  amount: number | string | BigNumber,
  decimals: number = 18,
): Promise<ContractTransaction> {
  await bindNetId(this)

  isBigNumber(amount)
  isAddress(tokenAddr)
  isAddress(spender)

  amount = ethers.utils.parseUnits(amount.toString(), decimals)
  let contract = initContract<ERC20>(tokenAddr, config.abi.ERC20, this._provider)
  return contract.approve(spender, amount)
}

//////// GETTERS ///////////////////

/**
 *
 * @param pool - pool address
 * @returns - total amount of funds that are currently due to lenders with all fees included
 */
export async function totalDue(pool: string): Promise<BigNumber> {
  await bindNetId(this)

  isAddress(pool)
  return initContract<Pool>(pool, config.abi.Pool, this._provider).totalDue()
}

/**
 *
 * @param pool - pool address
 * @param lender - lender address
 * @returns - total amount of funds that are currently due to the lender with all fees included
 */
export async function dueOf(pool: string, lender: string): Promise<Due<BigNumber>> {
  await bindNetId(this)

  isAddress(lender)
  isAddress(pool)
  const { due, spreadFee, originationFee, penalty } = await initContract<Pool>(
    pool,
    config.abi.Pool,
    this._provider,
  ).dueOf(lender)
  return {
    originationFee,
    penalty,
    due: due.add(spreadFee),
    spread: spreadFee,
    dueWithoutSpread: due,
  }
}

/**
 * Returns sum of interest, spread and penalty for the next payment to all lenders.
 *
 * @param pool - Address of the pool
 * @returns total due interest
 */
export async function totalDueInterest(pool: string): Promise<BigNumber> {
  await bindNetId(this)

  isAddress(pool)
  return initContract<Pool>(pool, config.abi.Pool, this._provider).totalDueInterest()
}

/**
 *
 * @param pool - Address of the pool
 * @param lender - Address of the lender
 * @returns something
 */
export async function dueInterestOf(pool: string, lender: string): Promise<DueInterest<BigNumber>> {
  await bindNetId(this)

  isAddress(lender)
  isAddress(pool)

  const { due, spreadFee, penalty } = await initContract<Pool>(
    pool,
    config.abi.Pool,
    this._provider,
  ).dueInterestOf(lender)

  return {
    interestPenalty: penalty,
    dueInterest: due.add(spreadFee),
    dueInterestWithoutSpread: due,
  }
}

/**
 * Returns principal and all interest accrued until the current moment.
 *
 * @param pool - address of the pool
 * @param lender - address of the lender
 * @returns - full amount of funds that are currently accrued to the lender
 */
export async function balanceOf(pool: string, lender: string): Promise<BigNumber> {
  await bindNetId(this)

  isAddress(lender)
  isAddress(pool)
  return initContract<Pool>(pool, config.abi.Pool, this._provider).balanceOf(lender)
}

/**
 *
 * @param pool - address of the pool
 * @param lender - address of the lender
 * @returns - current penalty of the lender
 */
export async function penaltyOf(pool: string, lender: string): Promise<BigNumber> {
  await bindNetId(this)

  isAddress(lender)
  isAddress(pool)
  return initContract<Pool>(pool, config.abi.Pool, this._provider).penaltyOf(lender)
}

/**
 * @dev Time intervals between timestamps are often 30 days, but last interval can be shorter.
 *
 * @param pool - address of the pool
 * @returns - the timestamp until which the next payment will be paid from the last paid timestamp
 */
export async function getNextPaymentTimestamp(pool: string): Promise<Number> {
  await bindNetId(this)

  isAddress(pool)
  return initContract<Pool>(pool, config.abi.Pool, this._provider)
    .getNextPaymentTimestamp()
    .then((v) => Number(v.toString()))
}

/**
 * @dev Check `defaultedAt` timestamp from the subgraph first, then call this function if it is 0.
 * If it is not 0, then the pool is already defaulted at the timestamp.
 *
 * @param pool address of the pool
 * @returns true if the pool can be defaulted
 */
export async function canBeDefaulted(pool: string): Promise<boolean> {
  await bindNetId(this)

  isAddress(pool)
  return initContract<Pool>(pool, config.abi.Pool, this._provider).canBeDefaulted()
}

/**
 * Calls `balanceOf()`, `dueOf()` and `penaltyOf()` for each provided pool for the `lender`, and returns the sum of each value.
 * Calls `dueInterestOf()` for each `lender` if the pool is not a bullet loan.
 *
 * @param lender address of the lender
 * @param pools [{pool_address, pool_asset, isBulletLoan}] list of pools data
 * @returns sum of {MemberAmounts} for the provided pools
 */
export async function lenderSumOfAmounts(
  lender: string,
  pools: Array<{ address: string; asset: string; isBulletLoan: boolean }>,
): Promise<MemberAmounts<BigNumber>> {
  await bindNetId(this)

  isAddress(lender)

  const targetCalls = pools.reduce((accumulator, pool) => {
    accumulator[pool.address] = [
      ['balanceOf', [lender]],
      ['dueOf', [lender]],
    ]

    if (!pool.isBulletLoan) {
      accumulator[pool.address].push(['dueInterestOf', [lender]])
    }

    return accumulator
  }, {})

  const multicallResult = await expectedMultiCall(this._provider, this.addresses.Multicall, targetCalls)

  const result = pools.reduce((accumulator, pool) => {
    const decimals = coins(pool.asset, this._network.id).decimals

    const [due, spread, origination, penalty] = multicallResult[pool.address].dueOf as BigNumber[]

    accumulator = {
      ...accumulator,
      originationFee: accumulator?.originationFee?.add(toWei(origination, decimals)),
      due: accumulator.due.add(toWei(due.add(spread), decimals)),
      spread: accumulator.spread.add(toWei(spread, decimals)),
      dueWithoutSpread: accumulator.dueWithoutSpread.add(toWei(due, decimals)),
      balance: accumulator.balance.add(
        toWei(multicallResult[pool.address].balanceOf as BigNumber, decimals),
      ),
      penalty: accumulator?.penalty?.add(toWei(penalty, decimals)),
    }
    if (!pool.isBulletLoan) {
      const [dueInterest, spreadInterest, penaltyInterest] = multicallResult[pool.address]
        .dueInterestOf as BigNumber[]
      accumulator = {
        ...accumulator,
        interestPenalty: accumulator?.interestPenalty.add(toWei(penaltyInterest, decimals)),
        dueInterest: accumulator?.dueInterest?.add(toWei(dueInterest.add(spreadInterest), decimals)),
        dueInterestWithoutSpread: accumulator?.dueInterestWithoutSpread?.add(
          toWei(dueInterest, decimals),
        ),
      }
    }
    return accumulator
  }, {} as MemberAmounts<BigNumber>)

  return result
}

/// calls from lender
/**
 *
 * @param lender
 * @param pools
 * @returns {MemberAmounts} for each pool
 *
 * @link dueOf TODO
 */
export async function lenderAmountsByPools(
  lender: string,
  pools: Array<{ address: string; asset: string; isBulletLoan: boolean }>,
): Promise<{ [key: string]: MemberAmounts<BigNumber> }> {
  await bindNetId(this)

  isAddress(lender)

  const targetCalls = pools.reduce((accumulator, pool) => {
    isAddress(pool.address)

    accumulator[pool.address] = [
      ...(accumulator[pool.address] || []),
      ['balanceOf', [lender]],
      ['dueOf', [lender]],
    ]

    if (!pool.isBulletLoan) {
      accumulator[pool.address].push(['dueInterestOf', [lender]])
    }

    return accumulator
  }, {})

  const multicallResult = await expectedMultiCall(this._provider, this.addresses.Multicall, targetCalls)

  const result = pools.reduce((accumulator, pool) => {
    const [due, spread, origination, penalty] = multicallResult[pool.address]['dueOf'] as BigNumber[]
    accumulator[pool.address] = {
      originationFee: origination,
      due: due.add(spread),
      spread: spread,
      dueWithoutSpread: due,
      balance: multicallResult[pool.address]['balanceOf'] as BigNumber,
      penalty: penalty,
    }

    if (!pool.isBulletLoan) {
      const [dueInterest, spreadInterest, penaltyInterest] = multicallResult[pool.address][
        'dueInterestOf'
      ] as BigNumber[]
      accumulator[pool.address].dueInterest = dueInterest.add(spreadInterest)
      accumulator[pool.address].dueInterestWithoutSpread = dueInterest
      accumulator[pool.address].interestPenalty = penaltyInterest
    }
    return accumulator
  }, {}) as Record<string, MemberAmounts<BigNumber>>
  return result
}

/**
 * Calls `balanceOf()`, `dueOf()` and `penaltyOf()` for the `pool` for each `lender`, and returns the sum of each value.
 * Calls `dueInterestOf()` for each `lender` if the pool is not a bullet loan.
 *
 * @param pool
 * @param lenders
 * @returns member amounts for each lender
 */
export async function lendersTotalAmountsOf(
  pool: { address: string; asset: string; isBulletLoan: boolean },
  lenders: string[],
): Promise<MemberAmounts<{ [key: string]: BigNumber }>> {
  await bindNetId(this)

  isAddress(pool.address)

  const targetCalls = lenders.reduce((accumulator, lender) => {
    isAddress(lender)

    if (!accumulator[pool.address]) {
      accumulator[pool.address] = [];
    }
    accumulator[pool.address].push(
      ['balanceOf', [lender]],
      ['dueOf', [lender]],
    )

    if (!pool.isBulletLoan) {
      accumulator[pool.address].push(['dueInterestOf', [lender]])
    }

    return accumulator
  }, {})

  const multicallResult = await expectedRichMultiCall(this._provider, this.addresses.Multicall, targetCalls)

  return lenders.reduce((accumulator, lender) => {
    const [due, spread, origination, penalty] = multicallResult[pool.address].dueOf[lender] as unknown as BigNumber[]
    accumulator[lender] = {
      originationFee: origination,
      due: due.add(spread),
      spread: spread,
      dueWithoutSpread: due,
      balance: multicallResult[pool.address].balanceOf[lender] as unknown as BigNumber,
      penalty: penalty,
    }

    if (!pool.isBulletLoan) {
      const [dueInterest, spreadInterest, penaltyInterest] = multicallResult[pool.address].dueInterestOf[
        lender
      ] as unknown as BigNumber[]
      accumulator[lender].dueInterest = dueInterest.add(spreadInterest)
      accumulator[lender].dueInterestWithoutSpread = dueInterest
      accumulator[lender].interestPenalty = penaltyInterest
    }
    return accumulator
  }, {} as MemberAmounts<{ [key: string]: BigNumber }>)
}

/**
 *
 * @param pools array of pool's data
 * @returns total amount due for a borrower for all pools
 */
export async function borrowerTotalDueOf(
  pools: Array<{ address: string; asset: string; isBulletLoan: boolean }>,
): Promise<BigNumber> {
  await bindNetId(this)

  const inputs: CallInput[] = []

  for (let pool of pools) {
    isAddress(pool.address)
    isAddress(pool.asset)
    inputs.push({ target: pool.address, function: 'totalDue', args: [], interface: config.abi.Pool })
  }

  const multicall = initContract<IMulticall3>(this.addresses.Multicall, config.abi.Multicall, this._provider);
  const dueAmounts: IMulticall3.ResultStruct[] = await multicall.callStatic.aggregate3(getEncodedFunctionData(inputs));

  return dueAmounts.reduce((acc, amount, index) => {
    const decimals = coins(pools[index].asset, this._network.id).decimals
    acc = acc.add(toWei(getDecodedResult(inputs[index], amount), decimals))
    return acc
  }, BigNumber.from(0))
}

/**
 * @dev `totalDue` and optionally `totalDueInterest` if pool is monthly loan for each pool.
 *
 * @param pools.address address of the pool.
 * @param pools.asset asset of the pool.
 * @param pools.isBulletLoan true if the pool is a bullet loan, false if it is a monthly loan.
 * @returns result[poolIndex] => { totalDue: BigNumber, totalDueInterest?: BigNumber}
 */
export async function borrowerTotalDueByPools(
  pools: Array<{ address: string; asset: string; isBulletLoan: boolean }>,
): Promise<{ [key: string]: { [key: string]: BigNumber } }> {
  await bindNetId(this)

  const targetToCalls = {}

  for (const pool of pools) {
    isAddress(pool.address)
    targetToCalls[pool.address] = [['totalDue', []]]
    if (!pool.isBulletLoan) {
      targetToCalls[pool.address].push(['totalDueInterest', []])
    }
  }

  const multicallResult = await expectedMultiCall(this._provider, this.addresses.Multicall, targetToCalls)
  return pools.reduce((acc, pool) => {
    acc[pool.address] = {
      totalDue: multicallResult[pool.address].totalDue,
    }
    if (!pool.isBulletLoan) {
      acc[pool.address].totalDueInterest = multicallResult[pool.address].totalDueInterest
    }
    return acc
  }, {} as Record<string, { [key: string]: BigNumber }>)
}

/**
 * Calculates the total due, penalty, interest, balance, accrued interest,
 * due without spread, and spread fee for a given set of lender positions
 * for a specific pool. The input object should contain information about the pool,
 * such as its rate and spread rate, as well as an array of lender positions.
 * The function sorts the positions by their start date and then iterates over them
 * to calculate the necessary values for each position.
 *
 * @param input An object containing information about the pool and an array of lender positions
 * @returns An object with properties for total due, penalty interest, balance, accrued interest,
 * due without spread, and spread fee, keyed by position ID.
 */
export async function lenderPositionsAmounts(
  input: lenderPositionsAmountsByPoolInput,
): Promise<Record<string, MemberAmounts<BigNumber>>> {
  await bindNetId(this)

  isBigNumber(input.poolInfo.rateMantissa)
  isBigNumber(input.poolInfo.spreadRate)

  return input.lenderInfo.positions.reduce((acc, position) => {
    acc[position.id] = _getPositionAmounts(input, position)
    return acc
  }, {})
}

// to add monthly interest here
export async function lenderPositionsAmountsByPool(
  positionsByPool: Record<string, lenderPositionsAmountsByPoolInput>,
): Promise<Record<string, MemberAmounts<Record<string, BigNumber>>>> {
  await bindNetId(this)

  const result: Record<string, MemberAmounts<Record<string, BigNumber>>> = {}
  for (const [poolKey, input] of Object.entries(positionsByPool)) {
    result[poolKey] = _lenderPositionsAmountsForPool(input)
  }
  return result
}
/**
 * Returns an object containing lender position amounts
 *
 * @param input Pool info and it's positions
 * @returns Object containing information on due, penalty, balance, accrued interest, due without spread, and spread for each lender position.
 */
function _lenderPositionsAmountsForPool(
  input: lenderPositionsAmountsByPoolInput
): MemberAmounts<{ [key: string]: BigNumber }> {
  const { positions } = input.lenderInfo

  return positions.reduce(
    (result, position) => {
      const positionData = _getPositionAmounts(input, position)
      const { id } = position

      result.due[id] = positionData.due
      result.penalty[id] = positionData.penalty
      result.balance[id] = positionData.balance
      result.accrued[id] = positionData.accrued
      result.dueWithoutSpread[id] = positionData.dueWithoutSpread
      result.spread[id] = positionData.spread

      if (positionData.dueInterest) {
        result.dueInterest[id] = positionData.dueInterest
        result.interestPenalty[id] = positionData.interestPenalty
        result.dueInterestWithoutSpread[id] = positionData.dueInterestWithoutSpread
      }

      return result
    },
    {
      due: {},
      penalty: {},
      balance: {},
      accrued: {},
      dueWithoutSpread: {},
      spread: {},
      dueInterest: {},
      interestPenalty: {},
      dueInterestWithoutSpread: {},
    },
  )
}

/**
 * This function calculates the amounts of various fields for a lender position.
 *
 * @param input an input object containing relevant data for the calculation.
 * @param position the lender position object for which the amounts are being calculated.
 * @returns an object containing the calculated amounts for the lender position.
 */
function _getPositionAmounts(
  input: lenderPositionsAmountsByPoolInput,
  position: Position,
): MemberAmounts<BigNumber> {
  const positionAmount = BigNumber.from(position.amount)
  const positionInterest = BigNumber.from(position.interest)
  let due = positionAmount.add(positionInterest)

  const { penaltyPeriod, nextPaymentPeriod, interestPenaltyPeriod } = calculateTimestamps(position, input)

  const result = {
    balance: positionAmount,
    accrued: Zero,
    penalty: calcInterest(positionAmount, input.poolInfo.penaltyRate, penaltyPeriod),
    due: due,
    dueWithoutSpread: Zero,
    spread: Zero,
    dueInterest: Zero,
    interestPenalty: calcInterest(positionAmount, input.poolInfo.penaltyRate, interestPenaltyPeriod),
    dueInterestWithoutSpread: Zero,
  } as MemberAmounts<BigNumber>

  if (position.paid) {
    let accruedInterest = positionInterest;
    if (Number(position.paidAt) > Number(position.endAt)) {
      accruedInterest = genInterest(
        positionInterest,
        Number(position.endAt),
        Number(position.timestamp),
        Number(position.paidAt),
      )
    }

    const spreadAmount = calcInterestForRate(
      accruedInterest,
      input.poolInfo.spreadRate
    )
    due = positionAmount.add(accruedInterest)

    result.accrued = accruedInterest
    result.due = due
    result.dueWithoutSpread = due.sub(spreadAmount)
    result.spread = spreadAmount

    return result
  } else {
    const accruedInterest = genInterest(
      positionInterest,
      Number(position.endAt),
      Number(position.timestamp),
      input.currentTs,
    )

    const accrualSpread = calcInterestForRate(accruedInterest, input.poolInfo.spreadRate);

    let spreadAmount = calcInterestForRate(positionInterest, input.poolInfo.spreadRate)
    if (input.currentTs > Number(position.endAt)) {
      due = accruedInterest.add(positionAmount)
      spreadAmount = calcInterestForRate(
        accruedInterest,
        input.poolInfo.spreadRate
      )
    }
    result.accrued = accruedInterest
    result.due = due
    result.dueWithoutSpread = due.sub(spreadAmount)
    result.spread = accrualSpread

    if (input.poolInfo.repaymentType === RepaymentType.MONTHLY) {
      result.dueInterest = calcInterest(
        positionAmount,
        input.poolInfo.rateMantissa,
        nextPaymentPeriod,
      )

      if (result.dueInterest.gt(0)) {
        const dueInterestSpread = calcInterestForRate(
          result.dueInterest,
          input.poolInfo.spreadRate
        )
        result.dueInterest = result.dueInterest
        result.dueInterestWithoutSpread = result.dueInterest.sub(dueInterestSpread)
      }
    }
  }
  return result
}

export async function getPenaltyRate(pool: string): Promise<BigNumber> {
  await bindNetId(this)
  isAddress(pool)

  return initContract<Pool>(
    pool,
    config.abi.Pool,
    this._provider,
  ).penaltyRatePerYear()
}

export async function getPenaltyRatePerYear(pool: string): Promise<BigNumber> {
  await bindNetId(this)
  isAddress(pool)

  return initContract<Pool>(
    pool,
    config.abi.Pool,
    this._provider,
  ).penaltyRatePerYear()
}
/// utils

function calcAnualRate(rate: BigNumberish, timestamp: BigNumberish = 86400) {
  return BigNumber.from(rate).mul(timestamp).div(YEAR)
}

export function calcInterest(principal: BigNumber, rate: BigNumberish, timestamp: BigNumberish) {
  return principal.mul(calcAnualRate(rate, timestamp)).div(One)
}

export function calcInterestForRate(interest: BigNumberish, rate: BigNumberish) {
  return BigNumber.from(interest).mul(rate).div(One)
}

function genInterest(
  totalInterest: BigNumber,
  maturity: number,
  startDate: number,
  currentTs: number,
) {
  return totalInterest.mul(currentTs - startDate).div(maturity - startDate)
}

function calculateTimestamps(position: Position, input: lenderPositionsAmountsByPoolInput) {
  const now = input.currentTs
  const maturity = Number(input.poolInfo.maturityDate)
  const lastPaidAt = Number(input.lenderInfo.lastPaidAt)
  const monthlyRound = Number(input.poolInfo.monthlyRound)
  const positionStartDate = Number(position.timestamp)
  const penaltyStartDate = maturity

  let nextPaymentPeriod = 0
  let interestPenaltyPeriod = 0;

  if (input.poolInfo.repaymentType === RepaymentType.MONTHLY) {
    nextPaymentPeriod =
      positionStartDate > lastPaidAt
        ? lastPaidAt + monthlyRound - positionStartDate
        : maturity - lastPaidAt > monthlyRound
          ? monthlyRound
          : maturity - lastPaidAt

    let nextPaymentDate = lastPaidAt + monthlyRound > maturity
      ? maturity : lastPaidAt + monthlyRound

    interestPenaltyPeriod = now > nextPaymentDate
      ? now - nextPaymentDate
      : 0

    nextPaymentPeriod = now > nextPaymentDate
      ? nextPaymentPeriod + (now - nextPaymentDate)
      : nextPaymentPeriod
  }

  let totalPeriod = now > maturity ? now - positionStartDate : maturity - positionStartDate

  // If pool is closed - closedAt
  // If loan is paid - paidAt
  // If pool is not closed - undefined;
  let penaltyPeriod = 0
  if (position.paid) {
    if (Number(position.paidAt) > penaltyStartDate) {
      penaltyPeriod = now - penaltyStartDate
    }
  } else {
    if (now > penaltyStartDate) {
      penaltyPeriod = now - penaltyStartDate
    }
  }

  return {
    totalPeriod,
    penaltyPeriod,
    nextPaymentPeriod,
    interestPenaltyPeriod,
    now,
  }
}

/**
 *
 * @param targetToCalls targets[conctractAddress][funcName, [args]]
 * @returns targets[conctractAddress][funcName] = call result
 */
async function expectedMultiCall(
  provider: providers.JsonRpcSigner,
  multicallAddr: string,
  targetToCalls: {
    [target: string]: Array<[string, any[]]>
  },
): Promise<{ [target: string]: { [funcName: string]: any } }> {
  const multicall = initContract(multicallAddr, config.abi.Multicall, provider);
  const inputs: CallInput[] = []

  for (const [target, calls] of Object.entries(targetToCalls)) {
    for (const [funcName, args] of calls) {
      inputs.push({ target, function: funcName, args, interface: config.abi.Pool })
    }
  }

  const results: IMulticall3.ResultStruct[] = await multicall.callStatic.aggregate3(getEncodedFunctionData(inputs));
  const output: { [target: string]: { [funcName: string]: any } } = {}

  let resultIndex = 0
  for (const [target, calls] of Object.entries(targetToCalls)) {
    const targetResult: { [funcName: string]: any } = {}
    for (const [funcName] of calls) {
      targetResult[funcName] = getDecodedResult(inputs[resultIndex], results[resultIndex])
      resultIndex++
    }
    output[target] = targetResult
  }

  return output
}

/**
 *
 * @param targetToCalls targets[contractAddress][funcName, [args]]
 * @returns targets[contractAddress][funcName][string(args)] = call result
 */
async function expectedRichMultiCall(
  provider: providers.JsonRpcSigner,
  multicallAddr: string,
  targetToCalls: {
    [target: string]: Array<[string, any[]]>
  },
): Promise<{ [target: string]: { [funcName: string]: { [args: string]: any } } }> {
  const multicall = initContract(multicallAddr, config.abi.Multicall, provider);
  const inputs: CallInput[] = []

  for (const [target, calls] of Object.entries(targetToCalls)) {
    for (const [funcName, args] of calls) {
      inputs.push({ target, function: funcName, args, interface: config.abi.Pool })
    }
  }

  const results: IMulticall3.ResultStruct[] = await multicall.callStatic.aggregate3(getEncodedFunctionData(inputs));
  const output: { [target: string]: { [funcName: string]: { [args: string]: any } } } = {}

  let resultIndex = 0
  for (const [target, calls] of Object.entries(targetToCalls)) {
    const targetResult: { [funcName: string]: { [args: string]: any } } = {}
    for (const [funcName, args] of calls) {
      if (!targetResult[funcName]) {
        targetResult[funcName] = {}
      }
      targetResult[funcName][args[0]] = getDecodedResult(inputs[resultIndex], results[resultIndex])
      resultIndex++
    }
    output[target] = targetResult
  }

  return output
}
export interface PoolI {
  createPool(data: IPool.PoolDataStruct, members?: string[]): Promise<ContractTransaction>
  closePool(pool: string): Promise<ContractTransaction>

  whitelistLenders(pool: string, members?: string[]): Promise<ContractTransaction>
  blacklistLenders(pool: string, members?: string[]): Promise<ContractTransaction>
  switchToPublic(pool: string): Promise<ContractTransaction>

  lend(
    asset: string,
    pool: string,
    amount: string | number | BigNumber,
  ): Promise<ContractTransaction>
  repay(pool: string, lender: string): Promise<ContractTransaction>
  repayAll(pool: string): Promise<ContractTransaction>
  repayInterest(pool: string): Promise<ContractTransaction>

  requestCallBack(pool: string): Promise<ContractTransaction>
  cancelCallBack(pool: string): Promise<ContractTransaction>

  requestRoll(pool: string): Promise<ContractTransaction>
  acceptRoll(pool: string): Promise<ContractTransaction>

  markPoolDefaulted(pool: string): Promise<ContractTransaction>
  close(pool: string): Promise<ContractTransaction>

  approveTransfer(
    tokenAddr: string,
    spender: string,
    amount: number | string | BigNumber,
    decimals: number,
  ): Promise<ContractTransaction>

  totalDue(pool: string): Promise<BigNumber>
  dueOf(pool: string, lender: string): Promise<Due<BigNumber>>
  totalDueInterest(pool: string): Promise<BigNumber>
  dueInterestOf(pool: string, lender: string): Promise<DueInterest<BigNumber>>
  balanceOf(pool: string, lender: string): Promise<BigNumber>
  penaltyOf(pool: string, lender: string): Promise<BigNumber>
  getNextPaymentTimestamp(pool: string): Promise<Number>
  canBeDefaulted(pool: string): Promise<boolean>

  lenderSumOfAmounts(
    lender: string,
    pools: Array<{ address: string; asset: string; isBulletLoan: boolean }>,
  ): Promise<MemberAmounts<BigNumber>>
  lenderAmountsByPools(
    lender: string,
    pools: Array<{ address: string; asset: string; isBulletLoan: boolean }>,
  ): Promise<{ [key: string]: MemberAmounts<BigNumber> }>
  lendersTotalAmountsOf(
    pool: { address: string; asset: string; isBulletLoan: boolean },
    lenders: string[],
  ): Promise<MemberAmounts<{ [key: string]: BigNumber }>>

  borrowerTotalDueOf(
    pools: Array<{ address: string; asset: string; isBulletLoan: boolean }>,
  ): Promise<BigNumber>
  borrowerTotalDueByPools(
    pools: Array<{ address: string; asset: string; isBulletLoan: boolean }>,
  ): Promise<{ [key: string]: { [key: string]: BigNumber } }>

  lenderPositionsAmounts(
    input: lenderPositionsAmountsByPoolInput,
  ): Promise<Record<string, MemberAmounts<BigNumber>>>
  lenderPositionsAmountsByPool(
    positionsByPool: Record<string, lenderPositionsAmountsByPoolInput>,
  ): Promise<Record<string, MemberAmounts<Record<string, BigNumber>>>>

  calcInterest(principal: BigNumber, rate: BigNumberish, timestamp: BigNumberish): BigNumber
  getPenaltyRate(pool: string): Promise<BigNumber>
  getPenaltyRatePerYear(pool: string): Promise<BigNumber>
}
