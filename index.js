﻿const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// Initialize Telegram bot
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

console.log('Bot initialized successfully');

// Store user data (wallet addresses, referrals, and balances)
const userData = {};

// Helper function to generate a unique invite link
function generateInviteLink(userId) {
    return `https://t.me/CashWaveTokenbot?start=${userId}`;
}

// Admin Telegram ID (for unrestricted access)
const ADMIN_ID = 6686791215;

// Helper function to check wallet validity
function isValidWallet(walletAddress) {
    return /^0x[a-fA-F0-9]{40}$/.test(walletAddress);
}

// Handle '/start' command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Initialize user data if not present
    if (!userData[userId]) {
        userData[userId] = { balance: 0, referrals: 0, wallet: null };
    }

    // Send inline keyboard with wallet setup option
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
    bot.sendMessage(chatId, 'Welcome! Please choose an option:', inlineKeyboard);
});

// Handle inline keyboard callbacks
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (data === 'withdraw') {
        // Check if the user has set a wallet address
        if (!userData[userId].wallet) {
            // Prompt user to set wallet address
            bot.sendMessage(chatId, 'You need to set a wallet address first. Please enter your Polygon/Ethereum wallet address (starts with 0x and 42 characters long):');
            return;
        }

        // Proceed with withdrawal (further logic will be added later)
        bot.sendMessage(chatId, 'Your wallet is set. Proceeding with withdrawal...');
    } else if (data === 'set_wallet') {
        // Prompt user to enter wallet address
        bot.sendMessage(chatId, 'Please enter your Polygon/Ethereum wallet address (starts with 0x and 42 characters long):');
        bot.once('message', (msg) => {
            const walletAddress = msg.text.trim();

            // Validate wallet address
            if (!isValidWallet(walletAddress)) {
                bot.sendMessage(chatId, 'Invalid wallet address. Please provide a valid Polygon Matic or Ethereum wallet address starting with "0x" and 42 characters.');
                bot.sendMessage(chatId, 'Please enter your wallet address again:');
                return;
            }

            // Save wallet address to user data
            userData[userId].wallet = walletAddress;

            // Notify the user their wallet is set
            bot.sendMessage(chatId, `Wallet successfully saved: ${walletAddress} for future withdrawals.`);

            // Return to main menu
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
            bot.sendMessage(chatId, 'Choose an option:', inlineKeyboard);
        });
    } else if (data === 'balance') {
        // Check user's balance
        const balance = userData[userId].balance || 0;
        bot.sendMessage(chatId, `Your balance: ${balance} CWAVE`);
    }
});

// Handle withdraw command and wallet validation
bot.onText(/\/withdraw/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Admin can withdraw anytime
    if (userId === ADMIN_ID) {
        bot.sendMessage(chatId, 'Admin can withdraw anytime. Proceeding with withdrawal...');
        // Admin withdrawal logic goes here
        return;
    }

    // Check if the user has set a wallet address
    if (!userData[userId] || !userData[userId].wallet) {
        bot.sendMessage(chatId, 'You need to set a wallet address first. Use the "Set Wallet" option to set your address.');
        return;
    }

    // Check if the balance is sufficient for withdrawal (e.g., minimum 1500 CWAVE)
    const balance = userData[userId].balance || 0;
    if (balance < 1500) {
        bot.sendMessage(chatId, 'Your balance is too low for withdrawal. Minimum withdrawal amount is 1500 CWAVE. Please invite more friends to earn CWAVE.');
        return;
    }

    // Prompt user to confirm withdrawal
    bot.sendMessage(chatId, `You have ${balance} CWAVE available for withdrawal. Is this correct?`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Confirm Withdrawal', callback_data: 'confirm_withdraw' }],
                [{ text: 'Reject Withdrawal', callback_data: 'reject_withdraw' }]
            ]
        }
    });
});

// Handle withdrawal confirmation or rejection
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (data === 'confirm_withdraw') {
        // Proceed with withdrawal logic here
        const balance = userData[userId].balance;
        userData[userId].balance = 0; // Reset balance after withdrawal

        bot.sendMessage(chatId, `Your withdrawal of ${balance} CWAVE has been processed. Your new balance is 0 CWAVE.`);
    } else if (data === 'reject_withdraw') {
        // Reject withdrawal and return to main menu
        bot.sendMessage(chatId, 'Withdrawal rejected. Returning to main menu.');

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
