const { Alchemy, Network, Wallet, Utils } = require('alchemy-sdk');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
require('dotenv').config();

// Initialize express app
const app = express();

// Load environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;
const alchemyApiKey = process.env.ALCHEMY_API_KEY;
const walletAddress = process.env.WALLET_ADDRESS;
const privateKey = process.env.PRIVATE_KEY;
const contractAddress = process.env.CONTRACT_ADDRESS;
const alchemyUrl = process.env.ALCHEMY_URL;

// Validate environment variables
if (!token || !alchemyApiKey || !walletAddress || !privateKey || !contractAddress || !alchemyUrl) {
    console.error('Please ensure all environment variables are set in Heroku.');
    process.exit(1);
}

// Initialize Telegram bot
const bot = new TelegramBot(token, { polling: true });

// Initialize Alchemy
const settings = {
    apiKey: alchemyApiKey,
    network: Network.MATIC_MAINNET,
    url: alchemyUrl,
};
const alchemy = new Alchemy(settings);

// Initialize wallet
const wallet = new Wallet(privateKey, alchemy);

// Store user data (wallet addresses and balances)
const userData = {};

// Admin ID (replace with your Telegram ID)
const ADMIN_ID = 6686791215;

// Helper function to generate a unique invite link
function generateInviteLink(userId) {
    return `https://t.me/your_bot_username?start=${userId}`;
}

// Start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || 'No Username';

    // Notify admin about new user
    bot.sendMessage(ADMIN_ID, `New user joined:\nID: ${userId}\nUsername: @${username}`);

    // Send inline keyboard
    const inlineKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '?? Balance', callback_data: 'balance' }],
                [{ text: '?? Withdraw', callback_data: 'withdraw' }],
                [{ text: '?? Referrals', callback_data: 'referrals' }],
                [{ text: '?? Invite Link', callback_data: 'invite_link' }]
            ]
        }
    };
    bot.sendMessage(chatId, 'Choose an option:', inlineKeyboard);
});

// Handle inline keyboard callbacks
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (data === 'balance') {
        // Check user's balance
        alchemy.core.getTokenBalances(walletAddress, [contractAddress]).then((response) => {
            const balance = response.tokenBalances[0].tokenBalance;
            const formattedBalance = balance / 1e18; // Adjust for token decimals
            bot.sendMessage(chatId, `Your balance: ${formattedBalance} tokens`);
        }).catch((err) => {
            console.error('Error:', err);
            bot.sendMessage(chatId, 'Failed to fetch balance. Please try again later.');
        });
    } else if (data === 'withdraw') {
        // Check if user has set a wallet
        if (!userData[userId] || !userData[userId].wallet) {
            bot.sendMessage(chatId, 'You need to set a wallet address first. Use /setwallet to set your Polygon Matic or Ethereum wallet.');
            return;
        }

        // Prompt user to enter withdrawal amount
        bot.sendMessage(chatId, 'Enter the amount you want to withdraw:');
        bot.once('message', (msg) => {
            const amount = parseFloat(msg.text);
            if (isNaN(amount) {
                bot.sendMessage(chatId, 'Invalid amount. Please enter a valid number.');
                return;
            }

            // Process withdrawal (this is a placeholder; implement your logic here)
            bot.sendMessage(chatId, `Withdrawal request for ${amount} tokens has been received.`);
        });
    } else if (data === 'referrals') {
        // Show referral count (placeholder)
        bot.sendMessage(chatId, 'You have 0 referrals.');
    } else if (data === 'invite_link') {
        // Generate and send unique invite link
        const inviteLink = generateInviteLink(userId);
        bot.sendMessage(chatId, `Your unique invite link: ${inviteLink}`);
    }
});

// Set wallet command
bot.onText(/\/setwallet (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const walletAddress = match[1];

    // Validate wallet address (basic check)
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        bot.sendMessage(chatId, 'Invalid wallet address. Please provide a valid Polygon Matic or Ethereum wallet address.');
        return;
    }

    // Save wallet address
    if (!userData[userId]) {
        userData[userId] = {};
    }
    userData[userId].wallet = walletAddress;

    bot.sendMessage(chatId, `Wallet address set successfully: ${walletAddress}`);
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});