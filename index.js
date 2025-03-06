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
    console.log('Received /start command');
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || 'No Username';

    // Notify admin about new user
    bot.sendMessage(ADMIN_ID, `New user joined:\nID: ${userId}\nUsername: @${username}`);

    // Check if user exists, otherwise initialize
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

// Handle inline keyboard callbacks for normal users
bot.on('callback_query', (query) => {
    console.log('Received callback query:', query.data);
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (data === 'balance') {
        // Check user's balance
        const balance = userData[userId].balance;
        bot.sendMessage(chatId, `Your balance: ${balance} CWAVE`);
    } else if (data === 'withdraw') {
        // Check if user has set a wallet
        if (!userData[userId].wallet) {
            bot.sendMessage(chatId, 'You need to set your wallet address first. Use /set_wallet to set your Polygon Matic or Ethereum wallet.');
            return;
        }

        // Check user's balance
        const balance = userData[userId].balance;
        if (balance < 1500) {
            bot.sendMessage(chatId, 'Minimum withdrawal is 1500 CWAVE. Keep inviting friends to earn more!');
            return;
        }

        // Ask for confirmation of withdrawal
        bot.sendMessage(chatId, `Your balance is ${balance} CWAVE. Proceed with withdrawal?`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Confirm Withdrawal', callback_data: 'confirm_withdraw' }],
                    [{ text: 'Cancel', callback_data: 'cancel_withdraw' }]
                ]
            }
        });
    } else if (data === 'set_wallet') {
        // Ask user to input wallet address
        bot.sendMessage(chatId, 'Please enter your Polygon/Ethereum wallet address (starts with 0x and 42 characters long):');
        bot.once('message', (msg) => {
            const walletAddress = msg.text.trim();

            // Validate wallet address (basic check)
            if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
                bot.sendMessage(chatId, 'Invalid wallet address. Please provide a valid Polygon Matic or Ethereum wallet address.');
                return;
            }

            // Save wallet address
            userData[userId].wallet = walletAddress;

            bot.sendMessage(chatId, 'Wallet successfully saved for future withdrawals!');
        });
    } else if (data === 'invite_link') {
        // Generate and send unique invite link
        const inviteLink = generateInviteLink(userId);
        bot.sendMessage(chatId, `Your unique invite link: ${inviteLink}`);
    }
});

// Handle withdrawal confirmation and execute the withdrawal
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (data === 'confirm_withdraw') {
        // Check if user has sufficient balance
        const balance = userData[userId].balance;
        if (balance >= 1500) {
            // Perform withdrawal logic here
            bot.sendMessage(chatId, 'Withdrawal has been processed successfully.');
            userData[userId].balance -= 1500; // Deduct the withdrawn amount
        } else {
            bot.sendMessage(chatId, 'Minimum withdrawal is 1500 CWAVE. Keep inviting friends to earn more!');
        }
    } else if (data === 'cancel_withdraw') {
        bot.sendMessage(chatId, 'Withdrawal cancelled.');
    }
});

// Admin Command: Set balance, withdraw, remove balance, and more
bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (userId !== ADMIN_ID) {
        bot.sendMessage(chatId, 'You are not authorized to use admin commands.');
        return;
    }

    // Admin-specific actions (add/remove balance, approve withdrawals, etc.)
    const inlineKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Add Balance to User', callback_data: 'add_balance' }],
                [{ text: 'Remove Balance from User', callback_data: 'remove_balance' }],
                [{ text: 'Approve Withdrawal', callback_data: 'approve_withdrawal' }]
            ]
        }
    };
    bot.sendMessage(chatId, 'Admin Commands:', inlineKeyboard);
});

// Admin - Add Balance to User
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
    } else if (data === 'remove_balance') {
        bot.sendMessage(chatId, 'Please enter the user ID to remove balance from:');
        bot.once('message', (msg) => {
            const userToRemove = msg.text.trim();

            // Check if user exists in userData
            if (!userData[userToRemove]) {
                bot.sendMessage(chatId, 'User not found.');
                return;
            }

            bot.sendMessage(chatId, 'Please enter the amount to remove:');
            bot.once('message', (msg) => {
                const amountToRemove = parseFloat(msg.text);
                if (isNaN(amountToRemove) || amountToRemove <= 0 || amountToRemove > userData[userToRemove].balance) {
                    bot.sendMessage(chatId, 'Invalid amount. Please enter a valid number.');
                    return;
                }

                userData[userToRemove].balance -= amountToRemove;
                bot.sendMessage(chatId, `Successfully removed ${amountToRemove} CWAVE from user ${userToRemove}.`);
            });
        });
    }
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
