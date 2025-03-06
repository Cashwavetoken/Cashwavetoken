const { Network, Alchemy } = require('alchemy-sdk');

// Weka vigezo vya mazingira
const alchemyApiKey = process.env.ALCHEMY_API_KEY || '_W2qlqzTbRsKSgmIiy_fFeeWqsyOX7K7'; // Weka API key yako hapa
const alchemyUrl = process.env.ALCHEMY_URL || 'https://polygon-mainnet.g.alchemy.com/v2/_W2qlqzTbRsKSgmIiy_fFeeWqsyOX7K7'; // Weka URL ya Alchemy hapa

// Hakikisha vigezo vipo
if (!alchemyApiKey || !alchemyUrl) {
    console.error('Tafadhali hakikisha vigezo vya mazingira vimewekwa.');
    process.exit(1);
}

// Anzisha Alchemy
const settings = {
    apiKey: alchemyApiKey,
    network: Network.MATIC_MAINNET, // Tumia Polygon Mainnet
    url: alchemyUrl,
};
const alchemy = new Alchemy(settings);

// Jaribu kuunganisha na Alchemy
(async () => {
    try {
        // Pata block ya sasa
        const blockNumber = await alchemy.core.getBlockNumber();
        console.log('Block number ya sasa:', blockNumber);

        // Pata maelezo ya block fulani
        const block = await alchemy.core.getBlock(blockNumber);
        console.log('Maelezo ya block:', block);
    } catch (err) {
        console.error('Kosa wakati wa kuunganisha na Alchemy:', err);
    }
})();