// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Ownable} from "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TransactionApprovalContract
 * @author anuragShingare30
 * @notice Contract handles fund transaction operations with pending states and approval mechanisms
 * @dev Implements a secure transaction approval system for ETH and ERC-20 token transfers 

    1. token tranfer (erc-20 or ETH) 
    2. Direct transfer, no need to deposit token in contract 
    3. Struct tnxData(owner,to,token,amount,nonce) to keep the data 
    4. mapping that will check the state and enum for state 
    5. proposeTnx(tnxData), approveTnx(id)->perform the transfer, cancelTnx(id)->cancel and delete the TnxData history
    6. events emission
 */
contract TransactionApprovalContract is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ ERRORS ============
    error InvalidTransactionId();
    error TransactionNotPending();
    error TransactionAlreadyExists();
    error InvalidRecipient();
    error InvalidAmount();
    error InvalidTokenAddress();
    error InsufficientBalance();
    error TransferFailed();
    error UnauthorizedAccess();
    error NonceAlreadyUsed();

    // ============ EVENTS ============
    event TransactionProposed(
        uint256 indexed transactionId,
        address indexed owner,
        address indexed to,
        address token,
        uint256 amount,
        uint256 nonce
    );
    
    event TransactionApproved(
        uint256 indexed transactionId,
        address indexed owner,
        address indexed to,
        address token,
        uint256 amount
    );
    
    event TransactionCancelled(
        uint256 indexed transactionId,
        address indexed owner
    );

    event NonceIncremented(address indexed user, uint256 newNonce);

    // ============ TYPE DECLARATIONS ============
    enum TransactionState {
        Pending,
        Approved,
        Cancelled
    }

    struct TnxData {
        address owner;
        address to;
        address token; // address(0) for ETH
        uint256 amount;
        uint256 nonce;
        TransactionState state;
        uint256 timestamp;
    }

    // ============ STATE VARIABLES ============
    uint256 private _transactionCounter;
    
    // Mapping from transaction ID to transaction data
    mapping(uint256 => TnxData) public transactions;
    
    // Mapping from user address to their current nonce
    mapping(address => uint256) public userNonces;
    
    // Mapping to check if a nonce has been used by a user
    mapping(address => mapping(uint256 => bool)) public usedNonces;
    
    // Mapping from user to array of their transaction IDs
    mapping(address => uint256[]) public userTransactions;

    // Constants
    address public constant ETH_ADDRESS = address(0);
    uint256 public constant TRANSACTION_TIMEOUT = 7 days;

    // ============ CONSTRUCTOR ============
    constructor() Ownable(msg.sender) {
        _transactionCounter = 1; // Start from 1 to avoid confusion with default value
    }

    // ============ MODIFIERS ============
    modifier validTransactionId(uint256 transactionId) {
        if (transactionId == 0 || transactionId >= _transactionCounter) {
            revert InvalidTransactionId();
        }
        _;
    }

    modifier onlyTransactionOwner(uint256 transactionId) {
        if (transactions[transactionId].owner != msg.sender) {
            revert UnauthorizedAccess();
        }
        _;
    }

    modifier transactionInState(uint256 transactionId, TransactionState expectedState) {
        if (transactions[transactionId].state != expectedState) {
            revert TransactionNotPending();
        }
        _;
    }

    // ============ EXTERNAL FUNCTIONS ============

    /**
     * @notice Propose a new transaction for approval
     * @param to The recipient address
     * @param token The token address (use address(0) for ETH)
     * @param amount The amount to transfer
     * @param nonce The nonce for this transaction (must be current user nonce)
     * @return transactionId The ID of the proposed transaction
     */
    function proposeTnx(
        address to,
        address token,
        uint256 amount,
        uint256 nonce
    ) external nonReentrant returns (uint256 transactionId) {
        // Input validation
        if (to == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
        if (nonce != userNonces[msg.sender]) revert NonceAlreadyUsed();
        if (usedNonces[msg.sender][nonce]) revert NonceAlreadyUsed();

        // Check balance before proposing (for ERC20 only, ETH will be provided during approval)
        if (token == ETH_ADDRESS) {
            // For ETH, we'll check the balance during approval when user sends the ETH
            if (msg.sender.balance < amount) revert InsufficientBalance();
        } else {
            if (token == address(0)) revert InvalidTokenAddress();
            if (IERC20(token).balanceOf(msg.sender) < amount) revert InsufficientBalance();
            // Check allowance for ERC20 tokens
            // IERC20(token).approve(address(this), type(uint256).max);
            if (IERC20(token).allowance(msg.sender, address(this)) < amount) {
                revert InsufficientBalance();
            }
        }

        // Create transaction
        transactionId = _transactionCounter++;

        // Mark nonce as used
        usedNonces[msg.sender][nonce] = true;
        
        transactions[transactionId] = TnxData({
            owner: msg.sender,
            to: to,
            token: token,
            amount: amount,
            nonce: nonce,
            state: TransactionState.Pending,
            timestamp: block.timestamp
        });
        
        // Add to user's transaction list
        userTransactions[msg.sender].push(transactionId);

        emit TransactionProposed(transactionId, msg.sender, to, token, amount, nonce);
    }

    /**
     * @notice Approve and execute a pending transaction
     * @param transactionId The ID of the transaction to approve
     */
    function approveTnx(uint256 transactionId) 
        external 
        payable
        nonReentrant 
        validTransactionId(transactionId)
        onlyTransactionOwner(transactionId)
        transactionInState(transactionId, TransactionState.Pending)
    {
        TnxData storage txn = transactions[transactionId];
        
        // Check if transaction has timed out
        if (block.timestamp > txn.timestamp + TRANSACTION_TIMEOUT) {
            txn.state = TransactionState.Cancelled;
            emit TransactionCancelled(transactionId, msg.sender);
            return;
        }

        // For ETH transfers, ensure sufficient ETH is sent with the transaction
        if (txn.token == ETH_ADDRESS) {
            require(msg.value >= txn.amount, "Insufficient ETH sent");
        }

        // Update state before external call
        txn.state = TransactionState.Approved;

        // Execute the transfer
        if (txn.token == ETH_ADDRESS) {
            _executeETHTransfer(txn.to, txn.amount);
            // Refund excess ETH if any
            if (msg.value > txn.amount) {
                (bool success, ) = payable(msg.sender).call{value: msg.value - txn.amount}("");
                require(success, "ETH refund failed");
            }
        } else {
            // For ERC20, revert if ETH was sent accidentally
            require(msg.value == 0, "ETH not accepted for token transfers");
            _executeTokenTransfer(txn.owner, txn.to, txn.token, txn.amount);
        }

        // Increment user nonce
        userNonces[msg.sender]++;
        emit NonceIncremented(msg.sender, userNonces[msg.sender]);

        emit TransactionApproved(transactionId, txn.owner, txn.to, txn.token, txn.amount);
    }

    /**
     * @notice Cancel a pending transaction
     * @param transactionId The ID of the transaction to cancel
     */
    function cancelTnx(uint256 transactionId) 
        external 
        nonReentrant
        validTransactionId(transactionId)
        onlyTransactionOwner(transactionId)
        transactionInState(transactionId, TransactionState.Pending)
    {
        TnxData storage txn = transactions[transactionId];
        txn.state = TransactionState.Cancelled;

        // Increment user nonce to prevent replay
        userNonces[msg.sender]++;
        emit NonceIncremented(msg.sender, userNonces[msg.sender]);

        emit TransactionCancelled(transactionId, msg.sender);
    }

    /**
     * @notice Emergency function to cancel any pending transaction (only owner)
     * @param transactionId The ID of the transaction to cancel
     */
    function emergencyCancelTnx(uint256 transactionId) 
        external 
        onlyOwner
        validTransactionId(transactionId)
        transactionInState(transactionId, TransactionState.Pending)
    {
        TnxData storage txn = transactions[transactionId];
        txn.state = TransactionState.Cancelled;

        emit TransactionCancelled(transactionId, txn.owner);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get transaction details by ID
     * @param transactionId The transaction ID
     * @return The transaction data
     */
    function getTransaction(uint256 transactionId) 
        external 
        view 
        validTransactionId(transactionId) 
        returns (TnxData memory) 
    {
        return transactions[transactionId];
    }

    /**
     * @notice Get all transaction IDs for a user
     * @param user The user address
     * @return Array of transaction IDs
     */
    function getUserTransactions(address user) external view returns (uint256[] memory) {
        return userTransactions[user];
    }

    /**
     * @notice Get pending transactions for a user
     * @param user The user address
     * @return Array of pending transaction IDs
     */
    function getPendingTransactions(address user) external view returns (uint256[] memory) {
        uint256[] memory userTxns = userTransactions[user];
        uint256 pendingCount = 0;

        // Count pending transactions
        for (uint256 i = 0; i < userTxns.length; i++) {
            if (transactions[userTxns[i]].state == TransactionState.Pending) {
                pendingCount++;
            }
        }

        // Create array of pending transaction IDs
        uint256[] memory pendingTxns = new uint256[](pendingCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < userTxns.length; i++) {
            if (transactions[userTxns[i]].state == TransactionState.Pending) {
                pendingTxns[index] = userTxns[i];
                index++;
            }
        }

        return pendingTxns;
    }

    /**
     * @notice Get current nonce for a user
     * @param user The user address
     * @return The current nonce
     */
    function getCurrentNonce(address user) external view returns (uint256) {
        return userNonces[user];
    }

    /**
     * @notice Get the total number of transactions
     * @return The transaction counter
     */
    function getTotalTransactions() external view returns (uint256) {
        return _transactionCounter - 1;
    }

    /**
     * @notice Check if a transaction has timed out
     * @param transactionId The transaction ID
     * @return True if the transaction has timed out
     */
    function isTransactionTimedOut(uint256 transactionId) 
        external 
        view 
        validTransactionId(transactionId) 
        returns (bool) 
    {
        TnxData memory txn = transactions[transactionId];
        return block.timestamp > txn.timestamp + TRANSACTION_TIMEOUT;
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @notice Execute ETH transfer
     * @param to The recipient address
     * @param amount The amount to transfer
     */
    function _executeETHTransfer(address to, uint256 amount) internal {
        (bool success, ) = payable(to).call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @notice Execute ERC20 token transfer
     * @param from The sender address
     * @param to The recipient address
     * @param token The token address
     * @param amount The amount to transfer
     */
    function _executeTokenTransfer(
        address from,
        address to,
        address token,
        uint256 amount
    ) internal {
        IERC20(token).safeTransferFrom(from, to, amount);
    }

    // ============ RECEIVE FUNCTION ============
    receive() external payable {
        // Allow contract to receive ETH
    }

    // ============ FALLBACK FUNCTION ============
    fallback() external payable {
        revert("Function not found");
    }
}