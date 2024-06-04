import { time } from '@nomicfoundation/hardhat-network-helpers'
import type { BaseContract, Signer } from 'ethers'
import { ethers } from 'hardhat'
import { AssertionError } from 'chai'

async function init<T extends BaseContract>(
  contractName: string,
  contractAddress: string,
): Promise<T> {
  return (await ethers.getContractAt(contractName, contractAddress)) as T
}

async function call<T>(
  contract: BaseContract,
  method: string,
  args: any = [],
  callOptions: any = {},
): Promise<T> {
  let [_args, options] = allowUndefinedArgs(args, callOptions)
  try {
    let result = await contract.functions[method](..._args, options)
    if (result.length > 1) {
      return result
    }
    return result[0]
  } catch (error: any) {
    throw new AssertionError(error).message
  }
}

async function send(
  contract: BaseContract,
  method: string,
  args: any[] = [],
  sendOptions: any = {},
) {
  let [_args, options] = allowUndefinedArgs(args, sendOptions)

  return contract.functions[method](..._args, options)
    .then((r) => r.wait())
    .then((r) => {
      return r
    })
    .catch((err) => {
      return err.message
    })
}

async function deploy<T extends BaseContract>(
  contractName: string,
  args = [],
  libs = {},
  sendOptions = {},
): Promise<T> {
  const Contract = await ethers.getContractFactory(contractName, {
    libraries: libs,
  })
  const contract = await Contract.deploy(...args, sendOptions)
  await contract.deployed()
  return contract as T
}

function connect<T extends BaseContract>(contract: BaseContract, signer: Signer): T {
  let newContract = contract.connect(signer)
  return newContract as T
}

function allowUndefinedArgs(args: any, sendOptions: any) {
  if (!Array.isArray(args)) {
    if (sendOptions !== undefined) {
      throw new Error(`Args expected to be an array, got ${args}`)
    }
    return [[], args]
  } else {
    return [args, sendOptions]
  }
}

let parseUnit = (amount: any, decimals = 18) => ethers.utils.parseUnits(amount, decimals)

const parseTime = async (seconds: number) => {
  const value = (await time.latest()) + seconds
  return value
}

const encodeAddressArray = (addresses: string[]): string => {
  let hex = '0x'
  hex += addresses.map((address) => address.substring(2, 42)).join('')

  return ethers.utils.hexlify(hex)
}

const day = 24 * 60 * 60

const year = 360 * day

const one = parseUnit('1')

const marginOfError = ethers.utils.parseUnits('0.0344', 18) // for 99% confidence level;

const constants = {
  zeroAddress: '0x0000000000000000000000000000000000000000',
  defaultAssets: [
    '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT
    '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC
    '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063', // DAI
  ],
  ownerInvalidErr: 'Ownable: caller is not the owner',
  contractInitializedErr: 'Initializable: contract is already initialized',
}

export {
  init,
  call,
  send,
  deploy,
  connect,
  constants,
  parseUnit,
  parseTime,
  encodeAddressArray,
  one,
  day,
  year,
  marginOfError,
}
