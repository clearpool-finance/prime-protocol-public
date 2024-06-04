import { DataSourceContext, BigInt } from '@graphprotocol/graph-ts'
import { LiquidityMinRangeChanged, MinDepositWindowChanged, MinMonthlyMaturityChanged, PoolCreated } from '../generated/PoolFactory/FactoryAbi'
import { Pool } from '../generated/templates'

import { createNewPool } from './pool'
import { getOrCreatePrimeEntity } from './util'

export function handleCreatePool(event: PoolCreated): void {
  let context = new DataSourceContext()
  let instance = getOrCreatePrimeEntity();

  let poolIndex = instance.poolIndex.plus(BigInt.fromI32(1));
  instance.poolIndex = poolIndex;

  context.setBytes('pool', event.params.pool)
  context.setBytes('currency', event.params.asset)
  context.setBigInt('index', poolIndex)
  instance.save()

  Pool.createWithContext(event.params.pool, context)
  createNewPool(event, poolIndex)
}


export function handleMinDepositChange(event: MinDepositWindowChanged): void {
  let instance = getOrCreatePrimeEntity();

  instance.minDepositWindow = event.params.newValue;
  instance.save();
}

export function handleMinMonthlyMaturityChange(event: MinMonthlyMaturityChanged): void {
  let instance = getOrCreatePrimeEntity();

  instance.minMonthlyMaturity = event.params.newValue;
  instance.save();
}

export function handleLiquidityMinRangeChange(event: LiquidityMinRangeChanged): void {
  let instance = getOrCreatePrimeEntity();

  instance.liquidityMinRange = event.params.newValue;
  instance.save();
}
