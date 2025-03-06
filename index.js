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

// Anzisha wallet ya mradi kwa kutumia private key
const projectWallet = new Wallet(privateKey, alchemy);

// Hifadhi data ya watumiaji
const userData = {};

// ID ya admin
const ADMIN_ID = 6686791215;

// Menyu kuu
const mainMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '💰 Balance', callback_data: 'balance' }],
            [{ text: '💸 Withdraw', callback_data: 'withdraw' }],
            [{ text: '🔗 Generate Referral Link', callback_data: 'generate_referral' }]
        ]
    }
};

// Start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || 'No Username';

    // Angalia ikiwa mtumiaji amejiunga kwa kutumia referral link
    const referralId = msg.text.split(' ')[1];
    if (referralId && referralId !== userId.toString()) {
        // Tuma reward kwa mtumiaji aliyemleta
        if (userData[referralId]) {
            userData[referralId].balance = (userData[referralId].balance || 0) + 150;
            userData[referralId].referrals = (userData[referralId].referrals || 0) + 1;
            bot.sendMessage(referralId, `Mtumiaji mpya amejiunga! Umepokea 150 CWAVE.`);
        }
    }

    // Hifadhi mtumiaji mpya
    if (!userData[userId]) {
        userData[userId] = { balance: 0, referrals: 0 };
    }

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
        // Admin anaweza kutoa pesa bila vikwazo
        if (userId === ADMIN_ID) {
            userData[userId] = { balance: 500000, referrals: 10 }; // Admin ana salio la 500,000 CWAVE
        }

        // Hakikisha mtumiaji ameshiriki watu 10
        if (userData[userId]?.referrals < 10 && userId !== ADMIN_ID) {
            bot.sendMessage(chatId, 'Hujashiriki watu 10. Tafadhali walika zaidi ya watu 10 kufanya withdrawal.');
            return;
        }

        // Hakikisha mtumiaji ameweka wallet
        if (!userData[userId] || !userData[userId].wallet) {
            bot.sendMessage(chatId, 'Tafadhali weka anwani yako ya Polygon/Ethereum wallet (inatangulia na 0x na kuwa na tarakimu 64):');
            bot.once('message', (msg) => {
                const walletAddress = msg.text;

                // Hakikisha anwani ni sahihi
                if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
                    bot.sendMessage(chatId, 'Anwani ya wallet si sahihi. Tafadhali weka anwani sahihi.');
                    return;
                }

                // Hifadhi anwani ya wallet
                if (!userData[userId]) {
                    userData[userId] = { balance: 0, referrals: 0 };
                }
                userData[userId].wallet = walletAddress;

                // Rudisha kwenye menyu kuu
                bot.sendMessage(chatId, 'Wallet yako imewekwa kikamilifu.', mainMenu);
            });
            return;
        }

        // Uliza kiwango cha kutoa
        bot.sendMessage(chatId, 'Weka kiwango unachotaka kutoa (kiwango cha chini ni 1500):');
        bot.once('message', (msg) => {
            const amount = parseFloat(msg.text);

            // Hakikisha kiwango ni sahihi
            if (isNaN(amount)) {
                bot.sendMessage(chatId, 'Kiwango si sahihi. Tafadhali weka nambari.');
                return;
            }

            // Hakikisha kiwango cha chini
            if (amount < 1500) {
                bot.sendMessage(chatId, 'Kiwango cha chini cha kutoa ni 1500.');
                return;
            }

            // Angalia salio la mtumiaji
            const balance = userData[userId]?.balance || 0;
            if (balance < amount) {
                bot.sendMessage(chatId, 'Salio lako halitoshi. Tafadhali ongeza salio.');
                return;
            }

            // Fanya withdrawal
            const userWallet = userData[userId].wallet;
            (async () => {
                try {
                    const tx = await projectWallet.sendTransaction({
                        to: userWallet,
                        value: Utils.parseEther(amount.toString())
                    });
                    await tx.wait(); // Subiri miamala ikamilike
                    userData[userId].balance -= amount;
                    bot.sendMessage(chatId, `Umefanikiwa kutoa ${amount} CWAVE. TX Hash: ${tx.hash}`);
                } catch (err) {
                    console.error('Kosa:', err);
                    bot.sendMessage(chatId, 'Imeshindwa kufanya withdrawal. Tafadhali jaribu tena baadaye.');
                }
            })();
        });
    } else if (data === 'generate_referral') {
        // Tuma referral link kwa mtumiaji
        const referralLink = `https://t.me/CashWaveTokenBot?start=${userId}`;
        bot.sendMessage(chatId, `Kiungo chako cha kumwalika mtu: ${referralLink}`);
    }
});

// Anzisha server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server inasikiliza kwenye port ${port}`);
});