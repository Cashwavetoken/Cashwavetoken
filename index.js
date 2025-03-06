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
console.log('Bot initialized successfully');

// Initialize Alchemy
const settings = {
    apiKey: alchemyApiKey,
    network: Network.MATIC_MAINNET,
    url: alchemyUrl,
};
const alchemy = new Alchemy(settings);

// Store user data (wallet addresses and balances)
const userData = {};

// Admin ID (replace with your Telegram ID)
const ADMIN_ID = 6686791215;

// Helper function to generate a unique invite link
function generateInviteLink(userId) {
    return `https://t.me/CashWaveTokenbot?start=${userId}`;
}

// Start command
bot.onText(/\/start/, (msg) => {
    console.log('Received /start command');
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || 'No Username';

    // Notify admin about new user
    bot.sendMessage(ADMIN_ID, `New user joined:\nID: ${userId}\nUsername: @${username}`);

    // Send inline keyboard
    const inlineKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '💰 Balance', callback_data: 'balance' }],
                [{ text: '💸 Withdraw', callback_data: 'withdraw' }],
                [{ text: '👥 Referrals', callback_data: 'referrals' }],
                [{ text: '🔗 Invite Link', callback_data: 'invite_link' }]
            ]
        }
    };
    bot.sendMessage(chatId, 'Choose an option:', inlineKeyboard);
});

// Handle inline keyboard callbacks
bot.on('callback_query', (query) => {
    console.log('Received callback query:', query.data);
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
            console.error('Alchemy error:', err);
            bot.sendMessage(chatId, 'Failed to fetch balance. Please try again later.');
        });
    } else if (data === 'withdraw') {
        // If user hasn't set wallet, ask them to set one
        if (!userData[userId] || !userData[userId].wallet) {
            bot.sendMessage(chatId, 'You need to set a wallet address first. Use /setwallet to set your Polygon Matic or Ethereum wallet.');
            return;
        }

        const wallet = userData[userId].wallet;

        // Ensure wallet is valid (starts with 0x and has 64 characters)
        if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
            bot.sendMessage(chatId, 'Invalid wallet address. Please use a valid Polygon Matic or Ethereum wallet address starting with 0x.');
            return;
        }

        // Check balance and proceed with withdrawal if sufficient funds
        alchemy.core.getTokenBalances(walletAddress, [contractAddress]).then((response) => {
            const balance = response.tokenBalances[0].tokenBalance;
            const formattedBalance = balance / 1e18;

            if (formattedBalance < 1500) {
                bot.sendMessage(chatId, 'Minimum withdrawal is 1500 tokens. Please invite more friends to earn $CWAVE.');
                return;
            }

            // Confirm withdrawal
            const inlineKeyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Confirm Withdraw', callback_data: 'confirm_withdraw' }],
                        [{ text: 'Reject Withdraw', callback_data: 'reject_withdraw' }]
                    ]
                }
            };
            bot.sendMessage(chatId, `Your balance is ${formattedBalance} tokens. Do you want to withdraw this amount?`, inlineKeyboard);
        }).catch((err) => {
            console.error('Alchemy error:', err);
            bot.sendMessage(chatId, 'Failed to fetch balance. Please try again later.');
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

// Admin command: Add balance
bot.onText(/\/addbalance (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = match[1]; // userId to add balance to
    const balanceToAdd = parseFloat(match[2]); // balance to add

    if (msg.from.id !== ADMIN_ID) {
        return bot.sendMessage(chatId, 'You are not authorized to perform this action.');
    }

    if (!userData[userId]) {
        userData[userId] = { balance: 0 };
    }

    userData[userId].balance += balanceToAdd;
    bot.sendMessage(chatId, `Added ${balanceToAdd} tokens to user ${userId}. New balance: ${userData[userId].balance} tokens.`);
});

// Admin command: Remove balance
bot.onText(/\/removebalance (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = match[1]; // userId to remove balance from
    const balanceToRemove = parseFloat(match[2]); // balance to remove

    if (msg.from.id !== ADMIN_ID) {
        return bot.sendMessage(chatId, 'You are not authorized to perform this action.');
    }

    if (!userData[userId] || userData[userId].balance < balanceToRemove) {
        return bot.sendMessage(chatId, 'User has insufficient balance.');
    }

    userData[userId].balance -= balanceToRemove;
    bot.sendMessage(chatId, `Removed ${balanceToRemove} tokens from user ${userId}. New balance: ${userData[userId].balance} tokens.`);
});

// Admin command: Withdraw
bot.onText(/\/adminwithdraw (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const amount = parseFloat(match[1]);

    if (msg.from.id !== ADMIN_ID) {
        return bot.sendMessage(chatId, 'You are not authorized to perform this action.');
    }

    // Perform withdrawal logic for admin (no referral check needed)
    bot.sendMessage(chatId, `Admin withdraw request for ${amount} tokens processed.`);
});

// Handle wallet setting command
bot.onText(/\/setwallet (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const wallet = match[1];

    // Validate wallet address (basic check)
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        bot.sendMessage(chatId, 'Invalid wallet address. Please provide a valid Polygon Matic or Ethereum wallet address starting with 0x.');
        return;
    }

    if (!userData[userId]) {
        userData[userId] = {};
    }
    userData[userId].wallet = wallet;

    bot.sendMessage(chatId, `Wallet successfully saved for future withdrawals: ${wallet}`);
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
