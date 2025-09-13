import { useReadContract } from 'wagmi'
import { CONTRACT_CONFIG, parseContractTransaction, type ParsedTransaction, type ContractTransaction } from './contract'

export function useTransaction(id: number) {
  const { data: transaction, isLoading, error } = useReadContract({
    ...CONTRACT_CONFIG,
    functionName: 'getTransaction',
    args: [BigInt(id)],
    query: {
      enabled: id > 0,
    },
  })

  const parsedTransaction: ParsedTransaction | undefined = transaction 
    ? parseContractTransaction(id, transaction as ContractTransaction)
    : undefined

  return {
    transaction: parsedTransaction,
    isLoading,
    error
  }
}

export function usePendingTransactionIds(address: `0x${string}` | undefined) {
  return useReadContract({
    ...CONTRACT_CONFIG,
    functionName: 'getPendingTransactions',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  }) as { data: bigint[] | undefined, refetch: () => void, isLoading: boolean, error: Error | null }
}

export function useUserTransactionIds(address: `0x${string}` | undefined) {
  return useReadContract({
    ...CONTRACT_CONFIG,
    functionName: 'getUserTransactions',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  }) as { data: bigint[] | undefined, refetch: () => void, isLoading: boolean, error: Error | null }
}