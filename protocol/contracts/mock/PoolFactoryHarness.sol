// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {PoolFactory} from '../Pool/PoolFactory.sol';

contract PoolFactoryHarness is PoolFactory {
  event MinDepositWindowChanged(uint256 newValue);
  event MinMonthlyMaturityChanged(uint256 newValue);
  event LiquidityMinRangeChanged(uint256 newValue);

  function updateMinDepositWindow(uint256 newValue) external onlyOwner {
    minDepositWindow = newValue;
    emit MinDepositWindowChanged(newValue);
  }

  function updateMinMonthlyMaturity(uint256 newValue) external onlyOwner {
    minMonthlyMaturity = newValue;
    emit MinMonthlyMaturityChanged(newValue);
  }

  function updateLiquidityMinRange(uint256 newValue) external onlyOwner {
    liquidityMinRange = newValue;
    emit LiquidityMinRangeChanged(newValue);
  }
}
