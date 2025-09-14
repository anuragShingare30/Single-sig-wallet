'use client'

import { useForm } from 'react-hook-form'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { CONTRACT_CONFIG, ETH_ADDRESS } from '../hooks/contract'
import { useEffect, useState } from 'react'

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
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0, // Always consider data stale
      gcTime: 0, // Don't cache data
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
    reset,
  } = useForm<ProposeTransactionForm>({
    defaultValues: {
      to: '',
      token: ETH_ADDRESS,
      customToken: '',
      amount: '',
    }
  })

  const selectedToken = watch('token')
  const [showPreview, setShowPreview] = useState(false)
  const [proposalData, setProposalData] = useState<ProposeTransactionForm | null>(null)

  // Log nonce changes for debugging
  useEffect(() => {
    console.log('Current nonce updated:', currentNonce?.toString())
  }, [currentNonce])

    // Reset form and refetch nonce after successful transaction
  useEffect(() => {
    if (isConfirmed) {
      console.log('Transaction confirmed, resetting form and refetching nonce')
      reset()
      setShowPreview(false)
      setProposalData(null)
      
      // Immediate refetch
      refetchNonce()
      
      // Force another refetch after a short delay to ensure nonce is updated
      setTimeout(() => {
        console.log('Force refetching nonce after timeout')
        refetchNonce()
      }, 2000)
    }
  }, [isConfirmed, reset, refetchNonce])

  const [isSubmitting, setIsSubmitting] = useState(false)

  const onSubmit = async (data: ProposeTransactionForm) => {
    if (isSubmitting) return // Prevent double submission
    
    if (!address || currentNonce === undefined) {
      console.error('Wallet not connected or nonce not available')
      return
    }

    setIsSubmitting(true)
    
    try {
      // Show preview first
      setProposalData(data)
      setShowPreview(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmProposal = async () => {
    if (!proposalData || !address || currentNonce === undefined) return

    try {
      // Use custom token address if "custom" is selected, otherwise use the selected token
      const tokenAddress = proposalData.token === 'custom' ? proposalData.customToken : proposalData.token
      
      // Validate custom token address if needed
      if (proposalData.token === 'custom') {
        if (!proposalData.customToken || proposalData.customToken.trim() === '') {
          console.error('Please enter a valid token address')
          return
        }
        if (!/^0x[a-fA-F0-9]{40}$/.test(proposalData.customToken)) {
          console.error('Invalid token address format')
          return
        }
      }

      // Validate amount
      const amountNum = parseFloat(proposalData.amount)
      if (amountNum <= 0) {
        console.error('Amount must be greater than 0')
        return
      }

      // For ETH, use parseEther to handle decimals properly
      // For tokens, convert to BigInt but multiply by 10^18 for standard ERC20 decimals
      let amount: bigint
      if (tokenAddress === ETH_ADDRESS) {
        amount = parseEther(proposalData.amount)
      } else {
        // For ERC20 tokens, assume 18 decimals (standard)
        // Convert amount to wei equivalent
        const amountStr = proposalData.amount
        if (amountStr.includes('.')) {
          amount = parseEther(amountStr) // This handles decimals properly
        } else {
          amount = BigInt(amountStr) * BigInt(10 ** 18) // Convert to 18 decimals
        }
      }

      // Additional validation: ensure amount is not zero after conversion
      if (amount === BigInt(0)) {
        console.error('Amount too small or invalid')
        return
      }

      console.log('Submitting transaction:', {
        to: proposalData.to,
        token: tokenAddress,
        amount: amount.toString(),
        nonce: currentNonce?.toString() || 'undefined',
        isETH: tokenAddress === ETH_ADDRESS
      })

      writeContract({
        ...CONTRACT_CONFIG,
        functionName: 'proposeTnx',
        args: [
          proposalData.to as `0x${string}`,
          tokenAddress as `0x${string}`,
          amount,
          currentNonce
        ]
      })
    } catch (err) {
      console.error('Error proposing transaction:', err)
      // Don't use alert, just log the error
    }
  }

  // Enhanced button state logic
  const isSubmitDisabled = () => {
    return !address || 
           currentNonce === undefined || 
           isPending || 
           isConfirming || 
           showPreview ||
           isSubmitting
  }

  const isConfirmDisabled = () => {
    return !proposalData || 
           !address || 
           currentNonce === undefined || 
           isPending || 
           isConfirming
  }

  const getButtonText = () => {
    if (showPreview) {
      return 'Review Transaction Above'
    }
    if (isSubmitting) {
      return 'Processing...'
    }
    if (isPending) {
      return 'Proposing Transaction...'
    }
    if (isConfirming) {
      return 'Confirming Transaction...'
    }
    if (!address) {
      return 'Connect Wallet First'
    }
    if (currentNonce === undefined) {
      return 'Loading Nonce...'
    }
    return 'Review Transaction'
  }

  const getConfirmButtonText = () => {
    if (isPending && isConfirming) {
      return 'Processing...'
    }
    if (isPending) {
      return 'Proposing...'
    }
    if (isConfirming) {
      return 'Confirming...'
    }
    return 'Confirm & Submit'
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Propose New Transaction</h2>
      
      <form 
        onSubmit={handleSubmit(onSubmit)} 
        className="space-y-4"
        onKeyDown={(e) => {
          // Prevent Enter key from submitting form when in input fields
          if (e.key === 'Enter' && e.target !== e.currentTarget) {
            e.preventDefault()
          }
        }}
      >
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
                message: 'Invalid amount format (use numbers only, e.g., 1.5)'
              },
              validate: (value) => {
                const num = parseFloat(value)
                if (num <= 0) return 'Amount must be greater than 0'
                if (selectedToken === ETH_ADDRESS && num > 1000) return 'ETH amount seems too large'
                return true
              }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.0"
          />
          {errors.amount && (
            <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {selectedToken === ETH_ADDRESS 
              ? 'Enter amount in ETH (e.g., 0.1 for 0.1 ETH)' 
              : 'Enter amount in tokens (will be converted to wei with 18 decimals)'
            }
          </p>
        </div>

        {/* Current Nonce Display */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Nonce
          </label>
          <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700">
            {currentNonce != null ? currentNonce.toString() : 'Loading...'}
          </div>
        </div>

        

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">
              <strong>Transaction Failed:</strong> {error.message}
            </p>
            <p className="text-xs text-red-500 mt-2">
              💡 Common issues:
              <br />• Make sure you have enough ETH balance
              <br />• Check if the recipient address is valid
              <br />• For tokens, ensure you have sufficient balance and allowance
              <br />• Verify the contract is deployed on Sepolia network
            </p>
          </div>
        )}        {/* Success Display */}
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

        {/* Transaction Preview */}
        {showPreview && proposalData && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="text-lg font-medium text-yellow-800 mb-3">Review Transaction</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">To:</span>
                <span className="font-mono text-gray-900">{proposalData.to}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold text-gray-900">{proposalData.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Token:</span>
                <span className="text-gray-900">
                  {proposalData.token === ETH_ADDRESS 
                    ? 'ETH' 
                    : proposalData.token === 'custom' 
                      ? `Custom: ${proposalData.customToken}`
                      : 'ERC-20 Token'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Nonce:</span>
                <span className="text-gray-900">{currentNonce?.toString()}</span>
              </div>
            </div>
            <div className="flex space-x-2 mt-4">
              <button
                type="button"
                onClick={confirmProposal}
                disabled={isConfirmDisabled()}
                className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                  isConfirmDisabled()
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {getConfirmButtonText()}
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                disabled={isPending || isConfirming}
                className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                  isPending || isConfirming
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitDisabled()}
          className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
            isSubmitDisabled()
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          {getButtonText()}
        </button>

        {/* Button Status Info */}
        {!address && (
          <p className="text-sm text-red-600 text-center">
            Please connect your wallet to continue
          </p>
        )}
        {address && currentNonce === undefined && (
          <p className="text-sm text-yellow-600 text-center">
            Loading your account nonce...
          </p>
        )}
        {(isPending || isConfirming) && (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-600">
                {isPending ? 'Submitting to blockchain...' : 'Waiting for confirmation...'}
              </span>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}