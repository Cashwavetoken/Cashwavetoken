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

// Admin Telegram ID (replace with your own Telegram ID)
const ADMIN_ID = 6686791215; // Admin's Telegram ID

// Store user data (wallet addresses, referrals, and balances)
const userData = {};

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

// Helper function to generate a unique invite link
function generateInviteLink(userId) {
    return `https://t.me/CashWaveTokenbot?start=${userId}`;
}

// Admin command - Only accessible to admin
bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (userId !== ADMIN_ID) {
        bot.sendMessage(chatId, 'You are not authorized to use this command.');
        return;
    }

    // Admin has a balance of 500,000 for testing
    if (!userData[userId]) {
        userData[userId] = { balance: 500000, referrals: 0 };
    }

    // Admin commands inline keyboard
    const adminKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Add Balance', callback_data: 'add_balance' }],
                [{ text: 'Remove Balance', callback_data: 'remove_balance' }],
                [{ text: 'Back to Main Menu', callback_data: 'main_menu' }]
            ]
        }
    };
    bot.sendMessage(chatId, 'Admin Menu: Choose an option.', adminKeyboard);
});

// Handle admin commands (Add/Remove balance)
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (userId !== ADMIN_ID) return;

    if (data === 'add_balance') {
        // Prompt admin to enter user ID and amount to add balance
        bot.sendMessage(chatId, 'Enter the user ID and amount to add (format: user_id amount):');
        bot.once('message', (msg) => {
            const [targetUserId, amount] = msg.text.split(' ');

            if (!targetUserId || isNaN(amount)) {
                bot.sendMessage(chatId, 'Invalid input. Please provide user ID and amount in the correct format.');
                return;
            }

            if (!userData[targetUserId]) {
                userData[targetUserId] = { balance: 0, referrals: 0 };
            }

            userData[targetUserId].balance += parseFloat(amount);
            bot.sendMessage(chatId, `Successfully added ${amount} CWAVE to user ${targetUserId}'s balance.`);
        });
    } else if (data === 'remove_balance') {
        // Prompt admin to enter user ID and amount to remove balance
        bot.sendMessage(chatId, 'Enter the user ID and amount to remove (format: user_id amount):');
        bot.once('message', (msg) => {
            const [targetUserId, amount] = msg.text.split(' ');

            if (!targetUserId || isNaN(amount)) {
                bot.sendMessage(chatId, 'Invalid input. Please provide user ID and amount in the correct format.');
                return;
            }

            if (!userData[targetUserId] || userData[targetUserId].balance < amount) {
                bot.sendMessage(chatId, 'Insufficient balance for this user.');
                return;
            }

            userData[targetUserId].balance -= parseFloat(amount);
            bot.sendMessage(chatId, `Successfully removed ${amount} CWAVE from user ${targetUserId}'s balance.`);
        });
    } else if (data === 'main_menu') {
        // Go back to the main menu
        const inlineKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '💰 Balance', callback_data: 'balance' }],
                    [{ text: '💸 Withdraw', callback_data: 'withdraw' }],
                    [{ text: '👥 Referrals', callback_data: 'referrals' }],
                    [{ text: '🔗 Invite Link', callback_data: 'invite_link' }],
                    [{ text: '🔑 Set Wallet Address', callback_data: 'set_wallet' }] // Add set wallet button
                ]
            }
        };
        bot.sendMessage(chatId, 'Choose an option:', inlineKeyboard);
    }
});

// Start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || 'No Username';

    // Check if the user came through a referral link
    const referrerId = msg.text.split('start=')[1]; // Extract the referrer ID from the invite link
    if (referrerId && referrerId !== userId.toString()) {
        // Award the referrer with 150 CWAVE
        if (!userData[referrerId]) {
            userData[referrerId] = { balance: 0, referrals: 0 };
        }
        // Add 150 CWAVE to the referrer's balance
        userData[referrerId].balance += 150;
        
        // Notify referrer about the reward
        bot.sendMessage(referrerId, 'New user joined! You received 150 CWAVE for the referral.');
        userData[referrerId].referrals += 1;
    }

    // Initialize user data if not present
    if (!userData[userId]) {
        userData[userId] = { balance: 0, referrals: 0 };
    }

    // Send inline keyboard
    const inlineKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '💰 Balance', callback_data: 'balance' }],
                [{ text: '💸 Withdraw', callback_data: 'withdraw' }],
                [{ text: '👥 Referrals', callback_data: 'referrals' }],
                [{ text: '🔗 Invite Link', callback_data: 'invite_link' }],
                [{ text: '🔑 Set Wallet Address', callback_data: 'set_wallet' }] // Add set wallet button
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
        const balance = userData[userId]?.balance || 0;
        bot.sendMessage(chatId, `Your balance: ${balance} CWAVE`);
    } else if (data === 'withdraw') {
        // Check if user has set a wallet
        if (!userData[userId] || !userData[userId].wallet) {
            bot.sendMessage(chatId, 'You need to set a wallet address first. Use /setwallet to set your Polygon Matic or Ethereum wallet.');
            return;
        }

        // Check balance and withdrawal eligibility
        const balance = userData[userId].balance || 0;
        if (balance < 1500) {
            bot.sendMessage(chatId, 'Low balance. Minimum withdrawal is 1500 CWAVE.');
            return;
        }

        // Check if user has referred at least 10 people
        const referrals = userData[userId].referrals || 0;
        if (referrals < 10) {
            bot.sendMessage(chatId, 'You need to invite at least 10 friends to withdraw CWAVE.');
            return;
        }

        // Verify wallet and confirm withdrawal
        bot.sendMessage(chatId, 'Please confirm your wallet address for withdrawal.', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Confirm Withdrawal', callback_data: 'confirm_withdraw' }],
                    [{ text: 'Reject Withdrawal', callback_data: 'reject_withdraw' }]
                ]
            }
        });
    } else if (data === 'set_wallet') {
        // Prompt user to enter wallet address
        bot.sendMessage(chatId, 'Please enter your Polygon/Ethereum wallet address (starts with 0x and 42 characters long):');

        bot.once('message', (msg) => {
            const enteredWallet = msg.text;

            // Validate wallet address
            if (!/^0x[a-fA-F0-9]{40}$/.test(enteredWallet)) {
                bot.sendMessage(chatId, 'Invalid wallet address. Please provide a valid Polygon Matic or Ethereum wallet address.');
                return;
            }

            // Save wallet address
            if (!userData[userId]) {
                userData[userId] = {};
            }
            userData[userId].wallet = enteredWallet;

            bot.sendMessage(chatId, `Wallet address set successfully: ${enteredWallet}`);
            
            // Return to main menu
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
            bot.sendMessage(chatId, 'Wallet address set. Choose an option:', inlineKeyboard);
        });
    } else if (data === 'confirm_withdraw') {
        // Proceed with withdrawal (Implement the actual transfer logic)
        const amount = userData[userId].balance;
        userData[userId].balance = 0; // Deduct balance after withdrawal

        bot.sendMessage(chatId, `Withdrawal of ${amount} CWAVE has been processed. Your new balance is 0 CWAVE.`);
    } else if (data === 'reject_withdraw') {
        bot.sendMessage(chatId, 'Withdrawal rejected. Returning to main menu.');
        // Return to main menu
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
    }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
