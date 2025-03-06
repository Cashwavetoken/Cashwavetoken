const { Alchemy, Network } = require('alchemy-sdk');

// Weka vigezo vya mazingira
const alchemyApiKey = process.env.ALCHEMY_API_KEY;
const alchemyUrl = process.env.ALCHEMY_URL;

// Hakikisha vigezo vipo
if (!alchemyApiKey || !alchemyUrl) {
    console.error('Tafadhali hakikisha vigezo vya mazingira vimewekwa.');
    process.exit(1);
}

// Anzisha Alchemy
const settings = {
    apiKey: alchemyApiKey,
    network: Network.MATIC_MAINNET,
    url: alchemyUrl,
};
const alchemy = new Alchemy(settings);

// Jaribu kuunganisha na Alchemy
(async () => {
    try {
        const blockNumber = await alchemy.core.getBlockNumber();
        console.log('Block number ya sasa:', blockNumber);
    } catch (err) {
        console.error('Kosa wakati wa kuunganisha na Alchemy:', err);
    }
})();