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

// Validate environment variables
if (!token || !alchemyApiKey || !walletAddress || !privateKey || !contractAddress || !alchemyUrl) {
    console.error('Error: Please ensure the following environment variables are set in Heroku:');
    if (!token) console.error('TELEGRAM_BOT_TOKEN');
    if (!alchemyApiKey) console.error('ALCHEMY_API_KEY');
    if (!walletAddress) console.error('WALLET_ADDRESS');
    if (!privateKey) console.error('PRIVATE_KEY');
    if (!contractAddress) console.error('CONTRACT_ADDRESS');
    if (!alchemyUrl) console.error('ALCHEMY_URL');
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

// Store user data (wallet addresses, referrals, and balances)
const userData = {};

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

    // Check if the user came through a referral link
    const referrerId = msg.text.split('start=')[1]; // Extract the referrer ID from the invite link
    if (referrerId && referrerId !== userId.toString()) {
        // Award the referrer with 150 CWAVE
        if (!userData[referrerId]) {
            userData[referrerId] = { balance: 0 };
        }
        // Add 150 CWAVE to the referrer's balance
        userData[referrerId].balance += 150;
        
        // Notify referrer about the reward
        bot.sendMessage(referrerId, 'New user joined! You received 150 CWAVE for the referral.');
    }

    // Initialize user data if not present
    if (!userData[userId]) {
        userData[userId] = { balance: 0 };
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
        if (!userData[userId] || !userData[userId].balance) {
            bot.sendMessage(chatId, 'You don\'t have a balance yet.');
            return;
        }
        const balance = userData[userId].balance;
        bot.sendMessage(chatId, `Your balance: ${balance} CWAVE`);
    } else if (data === 'withdraw') {
        // Check if user has set a wallet
        if (!userData[userId] || !userData[userId].wallet) {
            bot.sendMessage(chatId, 'You need to set a wallet address first. Use /setwallet to set your Polygon Matic or Ethereum wallet.');
            return;
        }

        // Check balance and withdrawal
        if (!userData[userId] || !userData[userId].balance || userData[userId].balance < 1500) {
            bot.sendMessage(chatId, 'Low balance. Minimum withdrawal is 1500 CWAVE.');
            return;
        }

        // Prompt user to enter withdrawal amount
        bot.sendMessage(chatId, 'Enter the amount you want to withdraw:');
        bot.once('message', (msg) => {
            const amount = parseFloat(msg.text);
            if (isNaN(amount) || amount < 1500) {
                bot.sendMessage(chatId, 'Invalid amount. Please enter a valid number with a minimum of 1500 CWAVE.');
                return;
            }

            // Process withdrawal here (integrate Alchemy's contract API to send tokens)
            bot.sendMessage(chatId, `Withdrawal request for ${amount} CWAVE tokens has been received. Processing withdrawal...`);
            
            // Example logic for token transfer using Alchemy's SDK (this part will depend on your contract)
            // bot.sendMessage(chatId, 'Withdrawal complete!');
        });
    } else if (data === 'referrals') {
        // Show referral count (placeholder)
        const referralsCount = Object.values(userData).filter(user => user.referrerId === userId).length;
        bot.sendMessage(chatId, `You have ${referralsCount} referrals.`);
    } else if (data === 'invite_link') {
        // Generate and send unique invite link
        const inviteLink = generateInviteLink(userId);
        bot.sendMessage(chatId, `Your unique invite link: ${inviteLink}`);
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
    }
});

// Admin command - Only accessible to admin
bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (userId !== ADMIN_ID) {
        bot.sendMessage(chatId, 'You are not authorized to use this command.');
        return;
    }

    // Admin has a balance of 5,000,000 for testing
    if (!userData[userId]) {
        userData[userId] = { balance: 5000000 };
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
                userData[targetUserId] = { balance: 0 };
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
                    [{ text: '🔗 Invite Link', callback_data: 'invite_link' }]
                ]
            }
        };
        bot.sendMessage(chatId, 'Choose an option:', inlineKeyboard);
    }
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
