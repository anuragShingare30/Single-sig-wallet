'use client'

import { useForm } from 'react-hook-form'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { CONTRACT_CONFIG, ETH_ADDRESS } from '../hooks/contract'
import { useEffect } from 'react'

interface ProposeTransactionForm {
  to: string
  token: string
  customToken: string
  amount: string
}

export function ProposeTransaction() {
  const { address } = useAccount()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  // Get current nonce for the user
  const { data: currentNonce, refetch: refetchNonce } = useReadContract({
    ...CONTRACT_CONFIG,
    functionName: 'getCurrentNonce',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset
  } = useForm<ProposeTransactionForm>({
    defaultValues: {
      to: '',
      token: ETH_ADDRESS,
      customToken: '',
      amount: '',
    }
  })

  const selectedToken = watch('token')
  const customTokenAddress = watch('customToken')

  // Reset form and refetch nonce after successful transaction
  useEffect(() => {
    if (isConfirmed) {
      reset()
      refetchNonce()
    }
  }, [isConfirmed, reset, refetchNonce])

  const onSubmit = async (data: ProposeTransactionForm) => {
    if (!address || currentNonce === undefined) {
      alert('Please connect your wallet')
      return
    }

    try {
      // Use custom token address if "custom" is selected, otherwise use the selected token
      const tokenAddress = data.token === 'custom' ? data.customToken : data.token
      const amount = tokenAddress === ETH_ADDRESS 
        ? parseEther(data.amount)
        : BigInt(data.amount)

      writeContract({
        ...CONTRACT_CONFIG,
        functionName: 'proposeTnx',
        args: [
          data.to as `0x${string}`,
          tokenAddress as `0x${string}`,
          amount,
          currentNonce
        ]
      })
    } catch (err) {
      console.error('Error proposing transaction:', err)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Propose New Transaction</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Recipient Address */}
        <div>
          <label htmlFor="to" className="block text-sm font-medium text-gray-700 mb-1">
            Recipient Address
          </label>
          <input
            type="text"
            id="to"
            {...register('to', {
              required: 'Recipient address is required',
              pattern: {
                value: /^0x[a-fA-F0-9]{40}$/,
                message: 'Invalid Ethereum address'
              }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0x..."
          />
          {errors.to && (
            <p className="mt-1 text-sm text-red-600">{errors.to.message}</p>
          )}
        </div>

        {/* Token Selection */}
        <div>
          <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
            Token
          </label>
          <select
            id="token"
            {...register('token', { required: 'Token selection is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={ETH_ADDRESS}>ETH</option>
            <option value="custom">Custom Token Address...</option>
          </select>
          {errors.token && (
            <p className="mt-1 text-sm text-red-600">{errors.token.message}</p>
          )}
        </div>

        {/* Custom Token Address Input */}
        {selectedToken === 'custom' && (
          <div>
            <label htmlFor="customToken" className="block text-sm font-medium text-gray-700 mb-1">
              Custom Token Address
            </label>
            <input
              type="text"
              id="customToken"
              {...register('customToken', {
                required: selectedToken === 'custom' ? 'Token address is required' : false,
                pattern: {
                  value: /^0x[a-fA-F0-9]{40}$/,
                  message: 'Invalid token address'
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0x..."
            />
            {errors.customToken && (
              <p className="mt-1 text-sm text-red-600">{errors.customToken.message}</p>
            )}
          </div>
        )}

        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Amount {(selectedToken === ETH_ADDRESS || selectedToken === 'custom') ? '(ETH/Tokens)' : '(Tokens)'}
          </label>
          <input
            type="text"
            id="amount"
            {...register('amount', {
              required: 'Amount is required',
              pattern: {
                value: /^\d+\.?\d*$/,
                message: 'Invalid amount format'
              }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.0"
          />
          {errors.amount && (
            <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
          )}
        </div>

        {/* Current Nonce Display */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Nonce
          </label>
          <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700">
            {currentNonce !== undefined ? currentNonce.toString() : 'Loading...'}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">
              Error: {error.shortMessage || error.message}
            </p>
          </div>
        )}

        {/* Success Display */}
        {isConfirmed && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-600">
              Transaction proposed successfully! 
              {hash && (
                <a 
                  href={`https://sepolia.etherscan.io/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 underline"
                >
                  View on Etherscan
                </a>
              )}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending || isConfirming || !address}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isPending || isConfirming 
            ? (isPending ? 'Proposing...' : 'Confirming...') 
            : 'Propose Transaction'
          }
        </button>
      </form>
    </div>
  )
}