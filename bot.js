require('dotenv').config(); // Soma vigezo vya mazingira kutoka kwenye faili ya .env
const TelegramBot = require('node-telegram-bot-api');
const { ethers } = require('ethers');

// Weka vigezo vya mazingira
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// Unganisha na Alchemy kwenye Polygon Network
const provider = new ethers.AlchemyProvider('matic', ALCHEMY_API_KEY); // Muundo mpya wa ethers.js v6
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

// Kazi ya kuvuta token
async function withdrawTokens(toAddress, amount) {
  const tx = await contract.transfer(toAddress, amount);
  await tx.wait();
  return tx.hash;
}

// Kazi ya kuanza bot
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Hello! Nipo tayari kukusaidia kuvuta token.');
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

// Anzisha bot
console.log('Bot imeanzishwa...');