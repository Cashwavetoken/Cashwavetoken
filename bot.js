require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { ethers } = require('ethers');

// Weka vigezo vya mazingira
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const ADMIN_ID = 6686791215; // Weka ID ya admin

// Unganisha na Alchemy kwenye Polygon Network
const provider = new ethers.AlchemyProvider('matic', ALCHEMY_API_KEY);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Weka ABI ya mkataba wa ERC-20 (badilisha kwa ABI yako)
const contractABI = [
  // Weka ABI ya mkataba wako hapa
  // Unaweza kupata ABI kutoka kwenye Remix, Hardhat, au Polygonscan
];

// Tengeneza mkataba
const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);

// Anzisha bot ya Telegram
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Hifadhi salio za watumiaji (kwa mfano tu)
const userBalances = {};

// Kazi ya kuvuta token
async function withdrawTokens(toAddress, amount) {
  const tx = await contract.transfer(toAddress, amount);
  await tx.wait();
  return tx.hash;
}

// Kazi ya kuongeza salio (kwa admin pekee)
function addBalance(userId, amount) {
  if (!userBalances[userId]) {
    userBalances[userId] = 0;
  }
  userBalances[userId] += amount;
}

// Inline Keyboard
const keyboard = {
  reply_markup: {
    inline_keyboard: [
      [{ text: 'Withdraw', callback_data: 'withdraw' }],
      [{ text: 'Check Balance', callback_data: 'balance' }],
      [{ text: 'Admin', callback_data: 'admin' }],
    ],
  },
};

// Kazi ya kuanza bot
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Chagua moja ya chaguo:', keyboard);
});

// Kazi ya kushughulikia callback queries
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  if (data === 'withdraw') {
    bot.sendMessage(chatId, 'Tumia: /withdraw <anwani> <kiasi>');
  } else if (data === 'balance') {
    const balance = userBalances[userId] || 0;
    bot.sendMessage(chatId, `Salio yako ni: ${balance} token`);
  } else if (data === 'admin') {
    if (userId === ADMIN_ID) {
      bot.sendMessage(chatId, 'Tumia: /addbalance <user_id> <kiasi>');
    } else {
      bot.sendMessage(chatId, 'Huna ruhusa ya kufanya hivyo.');
    }
  }
});

// Kazi ya kuvuta token
bot.onText(/\/withdraw (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const args = match[1].split(' ');

  if (args.length !== 2) {
    bot.sendMessage(chatId, 'Tumia: /withdraw <anwani> <kiasi>');
    return;
  }

  const toAddress = args[0];
  const amount = ethers.parseUnits(args[1], 18); // Badilisha kiasi kuwa wei

  try {
    const txHash = await withdrawTokens(toAddress, amount);
    bot.sendMessage(chatId, `Token zimevutwa! Tx Hash: ${txHash}`);
  } catch (error) {
    bot.sendMessage(chatId, `Hitilafu: ${error.message}`);
  }
});

// Kazi ya kuongeza salio (kwa admin pekee)
bot.onText(/\/addbalance (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (userId !== ADMIN_ID) {
    bot.sendMessage(chatId, 'Huna ruhusa ya kufanya hivyo.');
    return;
  }

  const args = match[1].split(' ');
  if (args.length !== 2) {
    bot.sendMessage(chatId, 'Tumia: /addbalance <user_id> <kiasi>');
    return;
  }

  const targetUserId = parseInt(args[0]);
  const amount = parseFloat(args[1]);

  if (isNaN(targetUserId) {
    bot.sendMessage(chatId, 'User ID sio sahihi.');
    return;
  }

  if (isNaN(amount)) {
    bot.sendMessage(chatId, 'Kiasi sio sahihi.');
    return;
  }

  addBalance(targetUserId, amount);
  bot.sendMessage(chatId, `Salio imeongezwa kwa user ${targetUserId}. Salio mpya: ${userBalances[targetUserId]}`);
});

// Anzisha bot
console.log('Bot imeanzishwa...');