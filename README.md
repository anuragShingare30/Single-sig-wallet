# Demo Video



https://github.com/user-attachments/assets/4e5cade5-dea4-4a57-8226-a30b4f7c3faa




# Approval Contract and Pending State System

- User can transfer `ERC-20 token and ETH` to recipent address
- Users provide the token address, amount and recipient addresS


## Functionality workflow

1. `connect wallet`
2. `proposeTransaction(to,tokenAddress,amount,nonce)` - User will create the transaction proposal which will be in pending state
3. `approveTransaction(txId)` - The transaction will be in pending state and no funds will move until user approves the transaction
4. `cancelTransaction(txId)` - User can cancel the transaction if it is in pending state
5. Visible pending transaction and transaction details
6. 7 days timeout to approve/cancel transaction
7. `nonce integration` - To prevent the replay attacks and re-entrancy attacks


## Tech Stack

1. `Smart contract` - Solidity,Foundry, Sepolia testnet
2. `Frontend` - Nextjs, Tailwind CSS
3. `Web3 libraries` - Wagmi,Viem,RainbowKit


## Smart Contract

1. contract is present in `smartcontract/TransactionApprovalContract.sol`
2. `contract abi and address` is present in `smartcontract/` folder

**Deployed contract address**: 0xBdBBaBdD5Ab1E8BA530c981B55dF34F6F4e62A88
**Chain**: Ethereum sepolia

## Run Locally

```bash
# fork the main repo
# clone the repo locally on your machine
cd my-app
npm install
npm run dev
```
