const { Network, Alchemy } = require('alchemy-sdk');

// Load environment variables or use fallback values
const alchemyApiKey = process.env.ALCHEMY_API_KEY || '_W2qlqzTbRsKSgmIiy_fFeeWqsyOX7K7'; // Replace with your API key
const alchemyUrl = process.env.ALCHEMY_URL || 'https://polygon-mainnet.g.alchemy.com/v2/_W2qlqzTbRsKSgmIiy_fFeeWqsyOX7K7'; // Replace with your Alchemy URL

// Ensure the environment variables are set
if (!alchemyApiKey || !alchemyUrl) {
    console.error('Please ensure the environment variables are properly set.');
    process.exit(1);
}

// Initialize Alchemy settings
const settings = {
    apiKey: alchemyApiKey,
    network: Network.MATIC_MAINNET, // Use Polygon Mainnet
    url: alchemyUrl,
};
const alchemy = new Alchemy(settings);

// Try connecting and fetching data from Alchemy
(async () => {
    try {
        // Get the current block number
        const blockNumber = await alchemy.core.getBlockNumber();
        console.log('Current block number:', blockNumber);

        // Fetch block details for the current block
        const block = await alchemy.core.getBlock(blockNumber);
        console.log('Block details:', block);
    } catch (err) {
        console.error('Error connecting to Alchemy:', err.message);
    }
})();
