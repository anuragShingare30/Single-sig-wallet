'use client'

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_CONFIG } from '../hooks/contract'
import { usePendingTransactionIds } from '../hooks/useTransactions'
import { useEffect } from 'react'
import { parseEther } from 'viem'

export function PendingTransactions() {
  const { address } = useAccount()
  const { writeContract, data: hash, isPending } = useWriteContract()

  // Wait for transaction confirmation
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // Get pending transaction IDs for current user
  const { data: pendingIds, refetch: refetchPending } = usePendingTransactionIds(address)

  // Refetch pending transactions after successful operations
  useEffect(() => {
    if (isConfirmed) {
      refetchPending()
    }
  }, [isConfirmed, refetchPending])

  const handleApprove = (id: bigint, isETH: boolean = true, amount: string = "0") => {
    const value = isETH ? parseEther(amount) : BigInt(0)
    
    writeContract({
      ...CONTRACT_CONFIG,
      functionName: 'approveTnx',
      args: [id],
      value,
    })
  }

  const handleCancel = (id: bigint) => {
    writeContract({
      ...CONTRACT_CONFIG,
      functionName: 'cancelTnx',
      args: [id],
    })
  }

  if (!address) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Pending Transactions</h2>
        <p className="text-gray-500 text-center py-8">Please connect your wallet</p>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Pending Transactions</h2>
      
      {!pendingIds || pendingIds.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No pending transactions</p>
      ) : (
        <div className="space-y-4">
          {pendingIds.map((id) => (
            <div key={id.toString()} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-sm font-medium text-gray-900">Transaction #{id.toString()}</span>
                  <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                    Pending
                  </span>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Use the contract directly or Etherscan to view full transaction details.
                </p>
                <p className="text-xs text-gray-500">
                  Transaction ID: {id.toString()}
                </p>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handleApprove(id, true, "0.01")}
                  disabled={isPending}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 text-sm"
                >
                  {isPending ? 'Processing...' : 'Approve & Execute'}
                </button>
                <button
                  onClick={() => handleCancel(id)}
                  disabled={isPending}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {pendingIds && pendingIds.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-600">
            💡 Tip: For ETH transactions, the approve button will send 0.01 ETH as an example. 
            For actual usage, you should fetch the transaction details first.
          </p>
        </div>
      )}
    </div>
  )
}