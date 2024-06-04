// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {Pool} from '../Pool/Pool.sol';

contract PoolHarness is Pool {
  event GracePeriodChanged(uint256 newPeriod);
  event MonthlyRoundPeriodChanged(uint256 newPeriod);
  event RollRangePeriodChanged(uint256 newPeriod);

  function updateGracePeriod(uint256 newPeriod) external onlyBorrower {
    gracePeriodDuration = newPeriod;
    emit GracePeriodChanged(newPeriod);
  }

  function updateMonthlyRoundPeriod(uint256 newPeriod) external onlyBorrower {
    monthlyPaymentRoundDuration = newPeriod;
    emit MonthlyRoundPeriodChanged(newPeriod);
  }

  function updateRollRangePeriod(uint256 newPeriod) external onlyBorrower {
    rollRangeDuration = newPeriod;
    emit RollRangePeriodChanged(newPeriod);
  }
}
