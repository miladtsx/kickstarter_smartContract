const assert = require('assert');
const Web3 = require('web3');
const ganache = require('ganache-cli');
const web3 = new Web3(ganache.provider());

const compiledFactory = require('../ethereum/build/factoryCampaign.json');
const compiledCampaign = require('../ethereum/build/Campaign.json');

let accounts;
let factory;
let campaignContractAddress;
let campaign;

beforeEach(async () => {

    accounts = await web3.eth.getAccounts();

    factory = await new web3.eth
        .Contract(JSON.parse(compiledFactory.interface))
        .deploy({ data: compiledFactory.bytecode })
        .send({ from: accounts[0], gas: '1,000,000' });

    await factory.methods.createCampaign(1)
        .send({ from: accounts[0], gas: '1000000' });

    [campaignContractAddress] = await factory.methods.getDeployedContracts().call();

    // bring that contract instance to js 
    campaign = await new web3.eth
        .Contract(
            JSON.parse(compiledCampaign.interface),
            campaignContractAddress
        );

});