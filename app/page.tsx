'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { ProposeTransaction } from '../components/ProposeTransaction'
import { PendingTransactions } from '../components/PendingTransactions'

export default function Home() {
  const { isConnected } = useAccount()

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Single Sig Wallet
            </h1>
            <p className="text-gray-600 mb-8">
              Connect your wallet to manage transactions
            </p>
            <ConnectButton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Single Sig Wallet
            </h1>
            <ConnectButton />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Propose New Transaction */}
        <ProposeTransaction />

        {/* Pending Transactions */}
        <PendingTransactions />
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-500 text-sm">
            <p>Contract: 0xBdBBaBdD5Ab1E8BA530c981B55dF34F6F4e62A88 (Sepolia)</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
