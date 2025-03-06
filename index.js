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

// Initialize wallet
const wallet = new Wallet(privateKey, alchemy);

// Store user data (wallet addresses, balances, etc.)
const userData = {};

// Admin ID (replace with your Telegram ID)
const ADMIN_ID = 6686791215;

// Helper function to generate a unique invite link
function generateInviteLink(userId) {
    return `https://t.me/your_bot_username?start=${userId}`;
}

// Start command
bot.onText(/\/start/, (msg) => {
    console.log('Received /start command');
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || 'No Username';

    // Notify admin about new user
    bot.sendMessage(ADMIN_ID, `New user joined:\nID: ${userId}\nUsername: @${username}`);

    // Initialize user data if not present
    if (!userData[userId]) {
        userData[userId] = { balance: 0, referrals: 0, wallet: null, allowWithdrawal: false };
    }

    // Send inline keyboard for regular users
    const inlineKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '💰 Balance', callback_data: 'balance' }],
                [{ text: '💸 Withdraw', callback_data: 'withdraw' }],
                [{ text: '👥 Referrals', callback_data: 'referrals' }],
                [{ text: '🔗 Invite Link', callback_data: 'invite_link' }],
                [{ text: '🔑 Set Wallet Address', callback_data: 'set_wallet' }]
            ]
        }
    };

    bot.sendMessage(chatId, 'Welcome! Please choose an option:', inlineKeyboard);
});

// Handle inline keyboard callbacks
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (data === 'balance') {
        // Show balance to the user
        const balance = userData[userId]?.balance || 0;
        bot.sendMessage(chatId, `Your balance: ${balance} CWAVE`);
    } else if (data === 'withdraw') {
        // Prompt the user to set wallet if they haven't set it
        if (!userData[userId]?.wallet) {
            bot.sendMessage(chatId, 'Please set your wallet address first. Use /setwallet command.');
            return;
        }

        // Check if the balance is sufficient for withdrawal
        if (userData[userId]?.balance < 1500) {
            bot.sendMessage(chatId, 'Minimum withdrawal is 1500 CWAVE. Please earn more tokens to withdraw.');
            return;
        }

        // Proceed with withdrawal (dummy logic for now)
        bot.sendMessage(chatId, 'Proceeding with withdrawal...');
    } else if (data === 'referrals') {
        // Show referral count (placeholder)
        bot.sendMessage(chatId, 'You have 0 referrals.');
    } else if (data === 'invite_link') {
        // Generate and send unique invite link
        const inviteLink = generateInviteLink(userId);
        bot.sendMessage(chatId, `Your unique invite link: ${inviteLink}`);
    } else if (data === 'set_wallet') {
        // Request wallet address
        bot.sendMessage(chatId, 'Please enter your Polygon/Ethereum wallet address (starts with 0x and 64 characters long).');
    }
});

// Set wallet command
bot.onText(/\/setwallet (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const walletAddress = match[1];

    // Validate wallet address format (starts with 0x and 64 characters)
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        bot.sendMessage(chatId, 'Invalid wallet address. Please provide a valid Polygon Matic or Ethereum wallet address.');
        return;
    }

    // Save wallet address
    if (!userData[userId]) {
        userData[userId] = { balance: 0, referrals: 0, wallet: null, allowWithdrawal: false };
    }
    userData[userId].wallet = walletAddress;

    bot.sendMessage(chatId, `Wallet address saved successfully: ${walletAddress}`);
});

// Admin Commands
bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Only allow admin to access this command
    if (userId !== ADMIN_ID) {
        bot.sendMessage(chatId, 'You are not authorized to use this command.');
        return;
    }

    // Admin command options
    const adminInlineKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Add Balance to User', callback_data: 'add_balance' }],
                [{ text: 'Remove Balance from User', callback_data: 'remove_balance' }],
                [{ text: 'Withdraw for Admin', callback_data: 'withdraw_admin' }],
                [{ text: 'Allow User to Withdraw', callback_data: 'allow_withdrawal' }]
            ]
        }
    };

    bot.sendMessage(chatId, 'Choose an admin action:', adminInlineKeyboard);
});

// Add balance to user
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (data === 'add_balance') {
        bot.sendMessage(chatId, 'Please enter the user ID to add balance to:');
        bot.once('message', (msg) => {
            const userToAdd = msg.text.trim();

            // Check if user exists in userData
            if (!userData[userToAdd]) {
                bot.sendMessage(chatId, 'User not found.');
                return;
            }

            bot.sendMessage(chatId, 'Please enter the amount to add:');
            bot.once('message', (msg) => {
                const amountToAdd = parseFloat(msg.text);
                if (isNaN(amountToAdd) || amountToAdd <= 0) {
                    bot.sendMessage(chatId, 'Invalid amount. Please enter a valid number.');
                    return;
                }

                userData[userToAdd].balance += amountToAdd;
                bot.sendMessage(chatId, `Successfully added ${amountToAdd} CWAVE to user ${userToAdd}.`);
            });
        });
    }
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
