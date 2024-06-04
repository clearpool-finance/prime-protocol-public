// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import '@openzeppelin/contracts/utils/Strings.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './ICoinKeeper.sol';

interface IERC20MintableBurnable is IERC20 {
  function faucet(uint256 amount) external;

  function faucetTo(address receiver, uint256 amount) external;
}

contract CoinKeeperMumbai is ICoinKeeper {
  address[] public allTokens;

  mapping(string => address) public tokenBySymbol;
  mapping(address => bool) public isTokenMintable;
  mapping(address => bool) public isTokenExists;

  /// @notice Returns msg.sender's balance of token
  function myBalanceOf(address token) external view returns (uint256) {
    return IERC20(token).balanceOf(msg.sender);
  }

  /// @notice Gives amount of token to msg.sender
  function claim(address token, uint256 amount) public tokenExists(token) returns (bool) {
    uint256 balance = IERC20(token).balanceOf(address(this));
    if (balance > amount) {
      return IERC20(token).transfer(msg.sender, amount);
    }
    if (isTokenMintable[token]) {
      IERC20MintableBurnable(token).faucetTo(msg.sender, amount);
      return true;
    }
    return false;
  }

  /// @notice Gives 1000 of each token to msg.sender
  function claimAll() external returns (bool) {
    for (uint256 i = 0; i < allTokens.length; i++) {
      uint256 tokenDecimals = IERC20Metadata(allTokens[i]).decimals();
      uint256 amount = 1000 * 10 ** tokenDecimals;
      claim(allTokens[i], amount);
    }
    return true;
  }

  /// @notice Adds token to the list of tokens
  /// @param token Address of the token
  /// @param symbol Symbol of the token
  /// @param isMintable Whether the token is mintable
  function addTokenToList(
    address token,
    string calldata symbol,
    bool isMintable
  ) external returns (bool) {
    require(!isTokenExists[token], 'Token already exists');
    require(tokenBySymbol[symbol] == address(0), 'Symbol already exists');

    allTokens.push(token);

    isTokenMintable[token] = isMintable;
    isTokenExists[token] = true;
    tokenBySymbol[symbol] = token;

    return true;
  }

  /// @notice Mints token to msg.sender
  function mintTokenToMe(address token, uint256 amount) external returns (bool) {
    return mintTokenTo(token, msg.sender, amount);
  }

  /// @notice Mints token to 'to'
  function mintTokenTo(
    address token,
    address to,
    uint256 amount
  ) public tokenExists(token) returns (bool) {
    require(isTokenMintable[token], 'Token is not mintable');
    IERC20MintableBurnable(token).faucetTo(to, amount);
    return true;
  }

  /// @notice Transfers token from this to msg.sender
  function transferTokenToMe(
    address token,
    uint256 amount
  ) external tokenExists(token) returns (bool) {
    return transferTokenTo(token, msg.sender, amount);
  }

  /// @notice Transfers token from this to 'to'
  function transferTokenTo(
    address token,
    address to,
    uint256 amount
  ) public tokenExists(token) returns (bool) {
    return IERC20(token).transfer(to, amount);
  }

  /// @notice Transfers token from 'from' to 'to'
  function transferTokenFromTo(
    address token,
    address from,
    address to,
    uint256 amount
  ) external tokenExists(token) returns (bool) {
    return IERC20(token).transferFrom(from, to, amount);
  }

  /// @notice Transfers ownership of token to 'newOwner'
  function transferOwnershipOfToken(address token, address newOwner) external tokenExists(token) {
    Ownable(token).transferOwnership(newOwner);
  }

  modifier tokenExists(address token) {
    require(isTokenExists[token], 'Token does not exist');
    _;
  }
}
