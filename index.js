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

// Admin's user ID
const adminId = 6686791215;

// Contract address (if interacting with a token contract)
const contractAddress = process.env.CONTRACT_ADDRESS;

// Start command with inline keyboard
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const options = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Check Balance', callback_data: 'balance' }],
                [{ text: 'Withdraw', callback_data: 'withdraw' }]
            ],
        },
    };
    bot.sendMessage(chatId, 'Welcome to the AutoPay Bot! Please choose an option below:', options);
});

// Handle inline button presses (balance, withdraw)
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    // Respond to the user pressing the buttons
    if (data === 'balance') {
        // Get the balance (for the admin wallet here as an example)
        const balance = await provider.getBalance(adminAddress);
        const formattedBalance = ethers.utils.formatEther(balance);
        bot.sendMessage(chatId, `Your current balance is: ${formattedBalance} MATIC`);
    } else if (data === 'withdraw') {
        // Prompt the user to input the amount to withdraw (simplified here for demo purposes)
        bot.sendMessage(chatId, 'Please type the amount of MATIC you want to withdraw (e.g., 1.5):');
        bot.onText(/(\d+(\.\d+)?)/, async (msg, match) => {
            const amount = match[1]; // Capture the amount entered by the user
            const userAddress = 'USER_WALLET_ADDRESS'; // Replace with the actual user's address

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
    }

    // Acknowledge callback query
    bot.answerCallbackQuery(callbackQuery.id);
});

// Admin command for distributing balance (with inline keyboard)
bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== adminId) {
        bot.sendMessage(chatId, 'You are not authorized to access this command.');
        return;
    }

    const options = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Distribute Balance to User', callback_data: 'distribute' }]
            ],
        },
    };

    bot.sendMessage(chatId, 'Admin Panel - Please choose an option:', options);
});

// Handle admin distribution command
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (data === 'distribute' && callbackQuery.from.id === adminId) {
        bot.sendMessage(chatId, 'Please enter the amount to distribute to users:');
        bot.onText(/(\d+(\.\d+)?)/, async (msg, match) => {
            const amount = match[1]; // Capture the amount entered by the admin

            // Replace with your logic to find the user addresses
            const userAddresses = ['USER_WALLET_ADDRESS']; // Example user addresses

            for (let userAddress of userAddresses) {
                const tx = {
                    to: userAddress,
                    value: ethers.utils.parseEther(amount),
                };

                try {
                    const txResponse = await wallet.sendTransaction(tx);
                    await txResponse.wait();
                    bot.sendMessage(chatId, `Distributed ${amount} MATIC to ${userAddress}`);
                } catch (error) {
                    console.error(error);
                    bot.sendMessage(chatId, `Error distributing funds to ${userAddress}.`);
                }
            }
        });
    }

    // Acknowledge callback query
    bot.answerCallbackQuery(callbackQuery.id);
});
