'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, polygon, optimism, arbitrum, base, sepolia } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'My App',
  projectId: '1c21a3bb757c23dd706c3d73c2f8452b', // Get this from WalletConnect Cloud
  chains: [mainnet, polygon, optimism, arbitrum, base, sepolia],
  ssr: true, // If your dApp uses server side rendering (SSR)
})