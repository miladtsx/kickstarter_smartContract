require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');
const Web3 = require('web3');

const { interface, bytecode } = require('./build/factoryCampaign.json');

const provider = new HDWalletProvider(
    {
        mnemonic: { phrase: process.env.YOUR_MNEMONIC },
        providerOrUrl: process.env.ETHEREUM_GATEWAY,
    }
);

const web3 = new Web3(provider);

(async () => {
    try {

        const accounts = await web3.eth.getAccounts();
        console.log(`deploying using ${accounts[0]} account`);
        const contract = await new web3.eth
            .Contract(JSON.parse(interface))
            .deploy({ data: bytecode });

        const contractInstance = await contract.send({
            gas: '1000000',
            from: accounts[0]
        });
        console.log(`Contract Deployed to ${contractInstance.options.address}`);

    }
    catch (error) {
        console.error(error);
    }

    provider.engine.stop();
})();