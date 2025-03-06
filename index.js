const { Alchemy, Network, Wallet, Utils } = require('alchemy-sdk');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
require('dotenv').config();

// Anzisha express
const app = express();

// Weka vigezo vya mazingira
const token = process.env.TELEGRAM_BOT_TOKEN;
const alchemyApiKey = process.env.ALCHEMY_API_KEY;
const walletAddress = process.env.WALLET_ADDRESS;
const privateKey = process.env.PRIVATE_KEY;
const contractAddress = process.env.CONTRACT_ADDRESS;
const alchemyUrl = process.env.ALCHEMY_URL;

// Hakikisha vigezo vipo
if (!token || !alchemyApiKey || !walletAddress || !privateKey || !contractAddress || !alchemyUrl) {
    console.error('Tafadhali hakikisha vigezo vya mazingira vimewekwa.');
    process.exit(1);
}

// Anzisha bot
const bot = new TelegramBot(token, { polling: true });
console.log('Bot imeanzishwa kikamilifu.');

// Anzisha Alchemy
const settings = {
    apiKey: alchemyApiKey,
    network: Network.MATIC_MAINNET,
    url: alchemyUrl,
};
const alchemy = new Alchemy(settings);

// Hifadhi data ya watumiaji
const userData = {};

// Menyu kuu
const mainMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '💰 Balance', callback_data: 'balance' }],
            [{ text: '💸 Withdraw', callback_data: 'withdraw' }],
            [{ text: '🔑 Set Wallet', callback_data: 'set_wallet' }]
        ]
    }
};

// Start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Chagua kitendo kutoka kwenye menyu:', mainMenu);
});

// Handle inline keyboard callbacks
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (data === 'balance') {
        // Angalia salio la mtumiaji
        alchemy.core.getTokenBalances(walletAddress, [contractAddress]).then((response) => {
            const balance = response.tokenBalances[0].tokenBalance;
            const formattedBalance = balance / 1e18; // Gawanya kwa decimals
            bot.sendMessage(chatId, `Salio lako: ${formattedBalance} tokeni`);
        }).catch((err) => {
            console.error('Kosa:', err);
            bot.sendMessage(chatId, 'Imeshindwa kusoma salio. Tafadhali jaribu tena baadaye.');
        });
    } else if (data === 'withdraw') {
        // Hakikisha mtumiaji ameweka wallet
        if (!userData[userId] || !userData[userId].wallet) {
            bot.sendMessage(chatId, 'Hujajaweka wallet yako. Tumia "Set Wallet" kwanza.');
            return;
        }

        // Uliza kiwango cha kutoa
        bot.sendMessage(chatId, 'Weka kiwango unachotaka kutoa (kiwango cha chini ni 1500):');
        bot.once('message', (msg) => {
            const amount = parseFloat(msg.text);

            // Hakikisha kiwango ni sahihi
            if (isNaN(amount) {
                bot.sendMessage(chatId, 'Kiwango si sahihi. Tafadhali weka nambari.');
                return;
            }

            // Hakikisha kiwango cha chini
            if (amount < 1500) {
                bot.sendMessage(chatId, 'Kiwango cha chini cha kutoa ni 1500.');
                return;
            }

            // Angalia salio la mtumiaji
            alchemy.core.getTokenBalances(walletAddress, [contractAddress]).then((response) => {
                const balance = response.tokenBalances[0].tokenBalance;
                const formattedBalance = balance / 1e18;

                // Hakikisha salio linatosha
                if (formattedBalance < amount) {
                    bot.sendMessage(chatId, 'Salio lako halitoshi. Tafadhali ongeza salio.');
                    return;
                }

                // Fanya withdrawal (hapa unaweza kuweka msimbo wa kutumia Alchemy API)
                bot.sendMessage(chatId, `Umefanikiwa kutoa ${amount} tokeni.`);
            }).catch((err) => {
                console.error('Kosa:', err);
                bot.sendMessage(chatId, 'Imeshindwa kufanya withdrawal. Tafadhali jaribu tena baadaye.');
            });
        });
    } else if (data === 'set_wallet') {
        // Uliza anwani ya wallet
        bot.sendMessage(chatId, 'Weka anwani yako ya Polygon/Ethereum wallet (inatangulia na 0x na kuwa na tarakimu 64):');
        bot.once('message', (msg) => {
            const walletAddress = msg.text;

            // Hakikisha anwani ni sahihi
            if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
                bot.sendMessage(chatId, 'Anwani ya wallet si sahihi. Tafadhali weka anwani sahihi.');
                return;
            }

            // Hifadhi anwani ya wallet
            if (!userData[userId]) {
                userData[userId] = {};
            }
            userData[userId].wallet = walletAddress;

            // Rudisha kwenye menyu kuu
            bot.sendMessage(chatId, 'Wallet yako imewekwa kikamilifu.', mainMenu);
        });
    }
});

// Anzisha server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server inasikiliza kwenye port ${port}`);
});