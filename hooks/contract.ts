import { contractAddress } from '../smartcontract/address'
import { abi } from '../smartcontract/abi'

export const CONTRACT_CONFIG = {
  address: contractAddress as `0x${string}`,
  abi: abi,
} as const

export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000' as const

export interface ContractTransaction {
  owner: string
  to: string
  token: string
  amount: bigint
  nonce: bigint
  state: number // 0 = Pending, 1 = Approved, 2 = Cancelled
  timestamp: bigint
}

export interface ParsedTransaction {
  id: number
  owner: string
  to: string
  token: string
  amount: string
  nonce: number
  state: 'Pending' | 'Approved' | 'Cancelled'
  timestamp: number
}

export function parseContractTransaction(
  id: number,
  contractTx: ContractTransaction
): ParsedTransaction {
  const stateMap = ['Pending', 'Approved', 'Cancelled'] as const
  
  return {
    id,
    owner: contractTx.owner,
    to: contractTx.to,
    token: contractTx.token,
    amount: contractTx.amount.toString(),
    nonce: Number(contractTx.nonce),
    state: stateMap[contractTx.state] || 'Pending',
    timestamp: Number(contractTx.timestamp) * 1000 // Convert to milliseconds
  }
}