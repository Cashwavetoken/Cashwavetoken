require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { Alchemy, Network } = require('alchemy-sdk');
const { ethers } = require('ethers');

// Initialize Telegram Bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Initialize Alchemy API
const alchemy = new Alchemy({
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.MATIC_MAINNET,  // Use Polygon mainnet
});

// Initialize Ethereum wallet (to sign transactions)
const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Admin wallet address
const adminAddress = process.env.WALLET_ADDRESS;

// Contract address (if interacting with a token contract)
const contractAddress = process.env.CONTRACT_ADDRESS;

// Define a basic command for the bot
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Welcome to the AutoPay Bot! Use /balance to check your balance.');
});

// Get user's balance
bot.onText(/\/balance/, async (msg) => {
    const chatId = msg.chat.id;
    
    // Fetch user balance (for example purposes, checking balance from the admin wallet)
    const balance = await provider.getBalance(adminAddress);
    const formattedBalance = ethers.utils.formatEther(balance);
    
    bot.sendMessage(chatId, `Your current balance is: ${formattedBalance} MATIC`);
});

// Command for admin to distribute tokens
bot.onText(/\/distribute (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const amount = match[1]; // Amount to distribute in MATIC

    // Ensure the user is an admin (check user ID)
    if (msg.from.id !== YOUR_ADMIN_ID) {
        bot.sendMessage(chatId, 'You are not authorized to perform this action.');
        return;
    }

    const recipient = 'USER_WALLET_ADDRESS'; // Replace with actual user address
    const tx = {
        to: recipient,
        value: ethers.utils.parseEther(amount),
    };

    // Sign and send the transaction
    try {
        const txResponse = await wallet.sendTransaction(tx);
        await txResponse.wait();
        bot.sendMessage(chatId, `Successfully distributed ${amount} MATIC to ${recipient}`);
    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, 'Error distributing funds.');
    }
});

// Withdraw funds command for users
bot.onText(/\/withdraw (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const amount = match[1]; // Amount to withdraw

    const userAddress = 'USER_WALLET_ADDRESS'; // Get the user's wallet address from msg or a database

    const tx = {
        to: userAddress,
        value: ethers.utils.parseEther(amount),
    };

    try {
        const txResponse = await wallet.sendTransaction(tx);
        await txResponse.wait();
        bot.sendMessage(chatId, `Withdrawal of ${amount} MATIC sent to ${userAddress}`);
    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, 'Error processing withdrawal.');
    }
});
