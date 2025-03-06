const { Alchemy, Network, Wallet } = require('alchemy-sdk');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// Initialize Telegram bot
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

console.log('Bot initialized successfully');

// Store user data (wallet addresses, referrals, and balances)
const userData = {};

// Admin Telegram ID (for unrestricted access)
const ADMIN_ID = 6686791215;

// Helper function to check wallet validity
function isValidWallet(walletAddress) {
    return /^0x[a-fA-F0-9]{40}$/.test(walletAddress); // Must start with 0x and be 42 characters long
}

// Initialize Alchemy (mocked for now)
const alchemySettings = {
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.MATIC_MAINNET,
};

const alchemy = new Alchemy(alchemySettings);

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
        // Admin and user check
        if (userId === ADMIN_ID) {
            bot.sendMessage(chatId, 'Admin, please follow the same withdrawal process as other users.');
        }

        // Check if the user has set a wallet address
        if (!userData[userId].wallet) {
            bot.sendMessage(chatId, 'You need to set a wallet address first. Please enter your Polygon/Ethereum wallet address (starts with 0x and 42 characters long):');
            return;
        }

        // Check if balance is sufficient for withdrawal (e.g., minimum 1500 CWAVE)
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
    } else if (data === 'referrals') {
        // Show referral count (This can be extended based on your referral logic)
        const referrals = userData[userId].referrals || 0;
        bot.sendMessage(chatId, `You have ${referrals} referrals.`);
    } else if (data === 'invite_link') {
        // Generate and send unique invite link
        const inviteLink = generateInviteLink(userId);
        bot.sendMessage(chatId, `Your unique invite link: ${inviteLink}`);
    }
});

// Helper function to generate a unique invite link
function generateInviteLink(userId) {
    return `https://t.me/CashWaveTokenbot?start=${userId}`;
}

// Handle withdrawal confirmation or rejection
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (data === 'confirm_withdraw') {
        // Proceed with withdrawal logic here
        const balance = userData[userId].balance;

        // Simulate withdrawal logic here (e.g., interact with Alchemy or your contract)
        // For now, we'll mock a successful transaction
        const withdrawalAmount = balance;

        // Reset balance after withdrawal
        userData[userId].balance = 0;

        bot.sendMessage(chatId, `Your withdrawal of ${withdrawalAmount} CWAVE has been processed. Your new balance is 0 CWAVE.`);

        // Here you would integrate with your contract to process the actual withdrawal
        // Use Alchemy or any other API for transaction processing

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

// Handle withdraw command and wallet validation
bot.onText(/\/withdraw/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Admin can withdraw anytime but still goes through the withdrawal flow
    if (userId === ADMIN_ID) {
        bot.sendMessage(chatId, 'Admin, please follow the same withdrawal process as other users.');
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
