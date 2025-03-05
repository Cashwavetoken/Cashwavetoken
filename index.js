const { Alchemy, Network, Wallet, Utils } = require('alchemy-sdk');
const TelegramBot = require('node-telegram-bot-api');
const ethers = require('ethers');
require('dotenv').config();

// Weka vigezo kutoka kwenye faili ya .env
const token = process.env.TELEGRAM_BOT_TOKEN;
const alchemyApiKey = process.env.ALCHEMY_API_KEY;
const walletAddress = process.env.WALLET_ADDRESS;
const privateKey = process.env.PRIVATE_KEY;
const contractAddress = process.env.CONTRACT_ADDRESS;
const alchemyUrl = process.env.ALCHEMY_URL;

// Hakikisha vigezo vipo
if (!token || !alchemyApiKey || !walletAddress || !privateKey || !contractAddress || !alchemyUrl) {
    console.error('Tafadhali hakikisha faili ya .env ina vigezo vyote vinavyohitajika.');
    process.exit(1);
}

// Anzisha bot bila proxy
const bot = new TelegramBot(token, {
    polling: true, // Tumia polling badala ya webhooks
});

// Weka mazingira ya Alchemy
const settings = {
    apiKey: alchemyApiKey,
    network: Network.MATIC_MAINNET,
    url: alchemyUrl,
};

const alchemy = new Alchemy(settings);

// Anzisha wallet kwa kutumia private key
const wallet = new Wallet(privateKey, alchemy);

// Hifadhi salio kwa kila mtumiaji
const userBalances = {};

// Weka ID ya admin (badilisha na ID yako ya Telegram)
const ADMIN_ID = 6686791215; // Weka ID yako ya Telegram hapa

// Msimbo wa kusimamia mazungumzo ya bot
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || 'No Username';

    // Tuma ujumbe kwa admin
    bot.sendMessage(ADMIN_ID, `Mtumiaji mpya amejiunga:\nID: ${userId}\nUsername: @${username}`);

    // Kusoma salio la wallet
    alchemy.core.getTokenBalances(walletAddress, [contractAddress]).then((response) => {
        const balance = response.tokenBalances[0].tokenBalance;
        const formattedBalance = balance / 1e18; // Gawanya kwa decimals ya tokeni
        bot.sendMessage(chatId, `Salio la wallet: ${formattedBalance} tokeni`);
    }).catch((err) => {
        console.error('Hitilafu:', err);
        bot.sendMessage(chatId, 'Kuna hitilafu katika kusoma salio. Tafadhali jaribu tena baadaye.');
    });
});

// Menyu ya admin
bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;

    if (chatId !== ADMIN_ID) {
        bot.sendMessage(chatId, 'Huna ruhusa ya kutumia amri hii.');
        return;
    }

    // Onyesha menyu ya admin
    const adminMenu = {
        reply_markup: {
            keyboard: [
                ['Gawa Salio', 'Ondoa Salio'],
                ['Angalia Salio la Mtumiaji']
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };
    bot.sendMessage(chatId, 'Chagua kitendo kutoka kwenye menyu ya admin:', adminMenu);
});

// Kusimamia matendo ya admin
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (chatId !== ADMIN_ID) return; // Tu admin anaweza kufanya mazungumzo haya

    if (text === 'Gawa Salio') {
        bot.sendMessage(chatId, 'Tuma ujumbe kwa muundo: "gawa <user_id> <amount>"');
    } else if (text === 'Ondoa Salio') {
        bot.sendMessage(chatId, 'Tuma ujumbe kwa muundo: "ondoa <user_id> <amount>"');
    } else if (text === 'Angalia Salio la Mtumiaji') {
        bot.sendMessage(chatId, 'Tuma ujumbe kwa muundo: "angalia <user_id>"');
    } else if (text.startsWith('gawa')) {
        const [, userId, amount] = text.split(' ');
        if (!userId || !amount || isNaN(amount)) {
            bot.sendMessage(chatId, 'Tafadhali tumia muundo sahihi: "gawa <user_id> <amount>"');
            return;
        }
        userBalances[userId] = (userBalances[userId] || 0) + parseFloat(amount);
        bot.sendMessage(chatId, `Umegawa ${amount} tokeni kwa mtumiaji ${userId}. Salio jipya: ${userBalances[userId]}`);
    } else if (text.startsWith('ondoa')) {
        const [, userId, amount] = text.split(' ');
        if (!userId || !amount || isNaN(amount)) {
            bot.sendMessage(chatId, 'Tafadhali tumia muundo sahihi: "ondoa <user_id> <amount>"');
            return;
        }
        if (!userBalances[userId] || userBalances[userId] < parseFloat(amount)) {
            bot.sendMessage(chatId, 'Salio la mtumiaji halitoshi.');
            return;
        }
        userBalances[userId] -= parseFloat(amount);
        bot.sendMessage(chatId, `Umeondoa ${amount} tokeni kwa mtumiaji ${userId}. Salio jipya: ${userBalances[userId]}`);
    } else if (text.startsWith('angalia')) {
        const [, userId] = text.split(' ');
        if (!userId) {
            bot.sendMessage(chatId, 'Tafadhali tumia muundo sahihi: "angalia <user_id>"');
            return;
        }
        const balance = userBalances[userId] || 0;
        bot.sendMessage(chatId, `Salio la mtumiaji ${userId}: ${balance} tokeni`);
    }
});

bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Maelekezo ya kutumia bot:\n\n/start - Anza kutumia bot\n/withdraw <amount> - Toa tokeni\n/help - Pata msaada');
});