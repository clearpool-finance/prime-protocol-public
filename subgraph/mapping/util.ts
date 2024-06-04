import { _Prime } from "../generated/schema";
import { BigInt } from '@graphprotocol/graph-ts'

export function getOrCreatePrimeEntity(): _Prime {
    let instance = _Prime.load('clearpool');

    if (instance === null) {
        instance = new _Prime('clearpool')
        instance.publicPools = []
        instance.members = []
        instance.poolIndex = new BigInt(0)

        instance.minDepositWindow = BigInt.fromI32(60 * 60) // 1 hours
        instance.minMonthlyMaturity = BigInt.fromI32(65 * 24 * 60 * 60) // 65 days
        instance.liquidityMinRange = BigInt.fromI32(49 * 60 * 60) // 49 hours
    }

    return instance
}