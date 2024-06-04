// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import '@openzeppelin/contracts/utils/Strings.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

interface ICoinKeeper {
  function tokenBySymbol(string calldata symbol) external view returns (address);

  function isTokenMintable(address token) external view returns (bool);

  function isTokenExists(address token) external view returns (bool);

  /// @notice Returns msg.sender's balance of token
  function myBalanceOf(address token) external view returns (uint256);

  /// @notice Gives amount of token to msg.sender
  function claim(address token, uint256 amount) external returns (bool);

  /// @notice Gives 1000 of each token to msg.sender
  function claimAll() external returns (bool);

  /// @notice Adds token to the list of tokens
  /// @param token Address of the token
  /// @param symbol Symbol of the token
  /// @param isMintable Whether the token is mintable
  function addTokenToList(
    address token,
    string calldata symbol,
    bool isMintable
  ) external returns (bool);

  /// @notice Mints token to 'to'
  function mintTokenTo(address token, address to, uint256 amount) external returns (bool);

  /// @notice Transfers token amount from this to msg.sender
  function transferTokenToMe(address token, uint256 amount) external returns (bool);

  /// @notice Transfers token from this to 'to'
  function transferTokenTo(address token, address to, uint256 amount) external returns (bool);

  /// @notice Transfers token from 'from' to 'to'
  function transferTokenFromTo(
    address token,
    address from,
    address to,
    uint256 amount
  ) external returns (bool);

  /// @notice Transfers ownership of token to 'newOwner'
  function transferOwnershipOfToken(address token, address newOwner) external;
}
