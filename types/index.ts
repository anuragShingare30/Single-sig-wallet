export interface Transaction {
  id: number
  owner: string
  to: string
  token: string
  amount: string
  nonce: number
  timestamp: number
  state: 'Pending' | 'Approved' | 'Cancelled'
}

export interface ProposeTransactionForm {
  to: string
  token: string
  amount: string
  nonce: number
}

export interface DashboardStats {
  currentNonce: number
  pendingTransactions: number
  totalTransactions: number
  ethBalance: string
}

export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000'

export const MOCK_TOKENS = [
  { address: ETH_ADDRESS, symbol: 'ETH', name: 'Ethereum' },
  { address: '0xA0b86a33E6417c94BE4e4A20Ac5b0F8c2c9A8e8b', symbol: 'USDC', name: 'USD Coin (Mock)' },
  { address: '0xB0c77B1234567890123456789012345678901234', symbol: 'USDT', name: 'Tether (Mock)' }
]