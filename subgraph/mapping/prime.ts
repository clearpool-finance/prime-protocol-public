import {
  MemberBlacklisted,
  MemberCreated,
  MemberWhitelisted,
  RiskScoreChanged,
} from '../generated/Prime/PrimeAbi'
import { Member } from '../generated/schema'
import { BigInt } from '@graphprotocol/graph-ts'

import { handleAddPrimeMember, handleRemovePrimeMember } from "./pool";

export function handleMemberCreate(event: MemberCreated): void {
  let member = Member.load(event.params.member.toHex())

  if (member == null) {
    member = new Member(event.params.member.toHex())

    member.status = 'PENDING'
    member.riskScore = new BigInt(0)
  }
  member.save()
}

export function handleMemberWhitelist(event: MemberWhitelisted): void {
  let member = Member.load(event.params.member.toHex())

  if (member != null) {
    member.status = 'WHITELISTED'
    handleAddPrimeMember(event.params.member)
    member.save()
  }
}

export function handleMemberBlacklist(event: MemberBlacklisted): void {
  let member = Member.load(event.params.member.toHex())

  if (member != null) {
    member.status = 'BLACKLISTED'
    handleRemovePrimeMember(event.params.member)
    member.save()
  }
}

export function handleMemberRiskScoreChange(event: RiskScoreChanged): void {
  let member = Member.load(event.params.member.toHex())

  if (member != null) {
    member.riskScore = event.params.score
    member.save()
  }
}