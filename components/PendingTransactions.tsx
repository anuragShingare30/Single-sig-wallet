'use client'

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_CONFIG, ETH_ADDRESS } from '../hooks/contract'
import { usePendingTransactionIds, useTransaction } from '../hooks/useTransactions'
import { useEffect } from 'react'
import { formatEther } from 'viem'

// Component to display individual transaction details
function TransactionDetails({ id }: { id: bigint }) {
  const { transaction, isLoading } = useTransaction(Number(id))
  const { writeContract, isPending } = useWriteContract()

  const handleApprove = () => {
    if (!transaction) return
    
    try {
      const value = transaction.token === ETH_ADDRESS ? BigInt(transaction.amount) : BigInt(0)
      
      writeContract({
        ...CONTRACT_CONFIG,
        functionName: 'approveTnx',
        args: [id],
        value,
      })
    } catch {
      console.error('Error preparing transaction approval')
    }
  }

  const handleCancel = () => {
    writeContract({
      ...CONTRACT_CONFIG,
      functionName: 'cancelTnx',
      args: [id],
    })
  }

  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="border border-gray-200 rounded-lg p-4">
        <p className="text-red-500 text-sm">Failed to load transaction details</p>
      </div>
    )
  }

  // Add safety checks for required fields
  if (!transaction.to || !transaction.token || !transaction.amount) {
    return (
      <div className="border border-gray-200 rounded-lg p-4">
        <p className="text-red-500 text-sm">Invalid transaction data</p>
      </div>
    )
  }

  const tokenDisplay = transaction.token === ETH_ADDRESS 
    ? 'ETH' 
    : transaction.token?.length >= 10 
      ? `${transaction.token.slice(0, 6)}...${transaction.token.slice(-4)}`
      : transaction.token || 'Unknown Token'

  const formattedAmount = (() => {
    try {
      const amountBigInt = BigInt(transaction.amount)
      return transaction.token === ETH_ADDRESS 
        ? `${formatEther(amountBigInt)} ETH`
        : `${formatEther(amountBigInt)} ${tokenDisplay}`
    } catch {
      return `${transaction.amount} (Raw)`
    }
  })()

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-sm font-medium text-gray-900">Transaction #{id.toString()}</span>
          <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
            Pending
          </span>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">{formattedAmount}</div>
          <div className="text-xs text-gray-500">Amount</div>
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">To:</span>
          <span className="font-mono text-gray-900">
            {transaction.to?.slice(0, 6)}...{transaction.to?.slice(-4)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Token:</span>
          <span className="text-gray-900">{tokenDisplay}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Proposer:</span>
          <span className="font-mono text-gray-900">
            {transaction.owner?.slice(0, 6)}...{transaction.owner?.slice(-4)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Nonce:</span>
          <span className="text-gray-900">{transaction.nonce?.toString()}</span>
        </div>
        {transaction.token !== ETH_ADDRESS && (
          <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
            <strong>Token Address:</strong> {transaction.token}
          </div>
        )}
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={handleApprove}
          disabled={isPending}
          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 text-sm"
        >
          {isPending ? 'Processing...' : 'Approve & Execute'}
        </button>
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export function PendingTransactions() {
  const { address } = useAccount()
  const { data: hash } = useWriteContract()

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
            <TransactionDetails key={id.toString()} id={id} />
          ))}
        </div>
      )}
      
      {pendingIds && pendingIds.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-600">
            💡 Each transaction shows complete details including recipient, amount, and token type.
            Approve to execute the transaction with the exact specified amount.
          </p>
        </div>
      )}
    </div>
  )
}