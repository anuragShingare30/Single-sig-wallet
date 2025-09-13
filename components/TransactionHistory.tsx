'use client'

import { useAccount } from 'wagmi'
import { useUserTransactionIds } from '../hooks/useTransactions'

export function TransactionHistory() {
  const { address } = useAccount()

  // Get all transaction IDs for current user
  const { data: userTxIds } = useUserTransactionIds(address)

  if (!address) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
        <p className="text-gray-500 text-center py-8">Please connect your wallet</p>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Transaction History</h2>
      </div>
      
      {!userTxIds || userTxIds.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No transactions found</p>
      ) : (
        <div className="space-y-3">
          {userTxIds.map((id) => (
            <div key={id.toString()} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">#{id.toString()}</span>
                </div>
              </div>
              
              <div className="mb-2">
                <p className="text-sm text-gray-600">
                  Use the contract directly or Etherscan to view full transaction details.
                </p>
                <p className="text-xs text-gray-500">
                  Transaction ID: {id.toString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {userTxIds && userTxIds.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-600">
            💡 Tip: To view detailed transaction information, use the contract&apos;s getTransaction function 
            with these IDs, or check them on Etherscan.
          </p>
        </div>
      )}
    </div>
  )
}