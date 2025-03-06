const { Alchemy, Network, Wallet, Utils } = require('alchemy-sdk');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
require('dotenv').config();

// Anzisha express
const app = express();

// Weka vigezo vya mazingira
const token = process.env.TELEGRAM_BOT_TOKEN;
const alchemyApiKey = process.env.ALCHEMY_API_KEY;
const privateKey = process.env.PRIVATE_KEY; // Private key ya wallet ya mradi
const alchemyUrl = process.env.ALCHEMY_URL;

// Hakikisha vigezo vipo
if (!token || !alchemyApiKey || !privateKey || !alchemyUrl) {
    console.error('Tafadhali hakikisha vigezo vya mazingira vimewekwa.');
    process.exit(1);
}

// Anzisha bot
const bot = new TelegramBot(token, { polling: true });
console.log('Bot imeanzishwa kikamilifu.');

// Anzisha Alchemy kwa Polygon Mainnet
const settings = {
    apiKey: alchemyApiKey,
    network: Network.MATIC_MAINNET, // Tumia Polygon Mainnet
    url: alchemyUrl,
};
const alchemy = new Alchemy(settings);

// Anzisha wallet ya mradi kwa kutumia private key
const projectWallet = new Wallet(privateKey, alchemy);

// Hifadhi data ya watumiaji
const userData = {};

// ID ya admin
const ADMIN_ID = 6686791215; // Weka ID yako ya Telegram hapa

// Weka salio la admin
userData[ADMIN_ID] = { balance: 500000 }; // Admin ana salio la 500,000 CWAVE

// Menyu kuu
const mainMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '💰 Balance', callback_data: 'balance' }],
            [{ text: '💸 Withdraw', callback_data: 'withdraw' }]
        ]
    }
};

// Start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Tuma menyu kuu
    bot.sendMessage(chatId, 'Chagua kitendo kutoka kwenye menyu:', mainMenu);
});

// Handle inline keyboard callbacks
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (data === 'balance') {
        // Angalia salio la mtumiaji
        const balance = userData[userId]?.balance || 0;
        bot.sendMessage(chatId, `Salio lako: ${balance} CWAVE`);
    } else if (data === 'withdraw') {
        // Hakikisha mtumiaji ni admin
        if (userId !== ADMIN_ID) {
            bot.sendMessage(chatId, 'Huna ruhusa ya kufanya withdrawal.');
            return;
        }

        // Uliza kiwango cha kutoa
        bot.sendMessage(chatId, 'Weka kiwango unachotaka kutoa:');
        bot.once('message', (msg) => {
            const amount = parseFloat(msg.text);

            // Hakikisha kiwango ni sahihi
            if (isNaN(amount)) {
                bot.sendMessage(chatId, 'Kiwango si sahihi. Tafadhali weka nambari.');
                return;
            }

            // Hakikisha kiwango kikubwa kuliko sifuri
            if (amount <= 0) {
                bot.sendMessage(chatId, 'Kiwango cha kutoa lazima kiwe kubwa kuliko sifuri.');
                return;
            }

            // Angalia salio la mtumiaji
            const balance = userData[userId]?.balance || 0;
            if (balance < amount) {
                bot.sendMessage(chatId, 'Salio lako halitoshi. Tafadhali ongeza salio.');
                return;
            }

            // Uliza anwani ya wallet
            bot.sendMessage(chatId, 'Weka anwani ya Polygon wallet (inatangulia na 0x na kuwa na tarakimu 64):');
            bot.once('message', async (msg) => {
                const recipientWallet = msg.text;

                // Hakikisha anwani ni sahihi
                if (!/^0x[a-fA-F0-9]{40}$/.test(recipientWallet)) {
                    bot.sendMessage(chatId, 'Anwani ya wallet si sahihi. Tafadhali weka anwani sahihi.');
                    return;
                }

                // Fanya withdrawal
                try {
                    const tx = await projectWallet.sendTransaction({
                        to: recipientWallet,
                        value: Utils.parseEther(amount.toString())
                    });
                    await tx.wait(); // Subiri miamala ikamilike
                    userData[userId].balance -= amount;
                    bot.sendMessage(chatId, `Umefanikiwa kutoa ${amount} CWAVE. TX Hash: ${tx.hash}`);
                } catch (err) {
                    console.error('Kosa:', err);
                    bot.sendMessage(chatId, 'Imeshindwa kufanya withdrawal. Tafadhali jaribu tena baadaye.');
                }
            });
        });
    }
});

// Anzisha server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server inasikiliza kwenye port ${port}`);
});