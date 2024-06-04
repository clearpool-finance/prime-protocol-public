// SPDX-License-Identifier: BSD-3-Clause
pragma solidity 0.8.17;

contract TxProxy {
  function callOut(
    address[] calldata addresses,
    bytes[] calldata data,
    uint256[] calldata values
  ) external payable returns (bytes[] memory results) {
    results = new bytes[](addresses.length);

    for (uint256 i = 0; i < addresses.length; i++) {
      (bool success, bytes memory result) = addresses[i].call{value: values[i]}(data[i]);
      require(success, 'TxProxy: Transaction failed');
      results[i] = result;
    }
    return results;
  }
}
