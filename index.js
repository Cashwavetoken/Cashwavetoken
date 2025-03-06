require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { ethers } = require('ethers');

// Weka vigezo vya mazingira
const {
  TELEGRAM_BOT_TOKEN,
  ALCHEMY_API_KEY,
  WALLET_ADDRESS,
  PRIVATE_KEY,
  CONTRACT_ADDRESS,
  ALCHEMY_URL,
} = process.env;

// Anzisha Telegram Bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Anzisha Alchemy Provider
const provider = new ethers.providers.JsonRpcProvider(ALCHEMY_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// ABI ya Token (Mfano: ERC-20 Token)
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

// Anzisha contract ya token
const tokenContract = new ethers.Contract(CONTRACT_ADDRESS, ERC20_ABI, wallet);

// Hifadhi taarifa za watumiaji
const users = {};

// Command: /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Karibu kwenye Auto-Pay Bot! Tumia /help kuona maagizo.');
});

// Command: /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpText = `
Maagizo:
1. /balance - Angalia balance yako
2. /withdraw <amount> <address> - Toa token kwenye anwani yako
3. /admin_add <user_id> <amount> - (Admin) Ongeza balance kwa mtumiaji
  `;
  bot.sendMessage(chatId, helpText);
});

// Command: /balance
bot.onText(/\/balance/, async (msg) => {
  const chatId = msg.chat.id;
  const userBalance = users[chatId]?.balance || 0;
  bot.sendMessage(chatId, `Balance yako ni: ${userBalance} tokens`);
});

// Command: /withdraw <amount> <address>
bot.onText(/\/withdraw (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const [amount, address] = match[1].split(' ');

  if (!users[chatId] || users[chatId].balance < parseFloat(amount)) {
    return bot.sendMessage(chatId, 'Balance yako haitoshi au haujasajiliwa.');
  }

  try {
    const tx = await tokenContract.transfer(address, ethers.utils.parseUnits(amount, 18));
    await tx.wait();
    users[chatId].balance -= parseFloat(amount);
    bot.sendMessage(chatId, `Umefanikiwa kutuma ${amount} tokens kwenye ${address}. TX Hash: ${tx.hash}`);
  } catch (err) {
    bot.sendMessage(chatId, 'Kosa wakati wa kutuma token: ' + err.message);
  }
});

// Command: /admin_add <user_id> <amount> (Admin Only)
bot.onText(/\/admin_add (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const [userId, amount] = match[1].split(' ');

  // Hakikisha ni admin
  if (chatId.toString() !== process.env.ADMIN_CHAT_ID) {
    return bot.sendMessage(chatId, 'Huna ruhusa ya kufanya hivyo.');
  }

  if (!users[userId]) {
    users[userId] = { balance: 0 };
  }
  users[userId].balance += parseFloat(amount);
  bot.sendMessage(chatId, `Umefanikiwa kuongeza ${amount} tokens kwa mtumiaji ${userId}.`);
});

// Anzisha server kwa Heroku
const PORT = process.env.PORT || 3000;
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});