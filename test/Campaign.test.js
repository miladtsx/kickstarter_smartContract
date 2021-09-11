const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());

const compiledFactory = require('../ethereum/build/factoryCampaign.json');
const compiledCampaign = require('../ethereum/build/Campaign.json');

let accounts;
let deployedFactoryContract;
let campaignContractAddress;
let deployedCampaignContract;

beforeEach(async () => {

    accounts = await web3.eth.getAccounts();

    // Deploy Factory Contract
    deployedFactoryContract = await new web3.eth
        .Contract(JSON.parse(compiledFactory.interface))
        .deploy({ data: compiledFactory.bytecode })
        .send({ from: accounts[0], gas: '1000000' });

    // Deploy a Campaign
    await deployedFactoryContract.methods.createCampaign(1)
        .send({ from: accounts[1], gas: '1000000' });

    // Get Campaign contracts' address 
    [campaignContractAddress] = await deployedFactoryContract.methods.getDeployedContracts().call();

    // bring Campaign contract instance to js 
    deployedCampaignContract = await new web3.eth
        .Contract(
            JSON.parse(compiledCampaign.interface),
            campaignContractAddress
        );
});

describe('Campaigns', () => {
    it('should deploy contracts', async () => {
        assert.ok(deployedFactoryContract.options.address);
        assert.ok(deployedCampaignContract.options.address);
    });

    it('should mark caller as the campaign manager', async () => {
        const campaignManager = await deployedCampaignContract.methods.manager().call();
        assert.equal(accounts[1], campaignManager);
    });
    // Finilize after request approved
    it('people should be able to contribute', async () => {

        const contributer = accounts[2];
        await deployedCampaignContract.methods.contribute().send({ from: contributer, value: 1 });

        const contributersCount = await deployedCampaignContract.methods.contributersCount().call();
        assert.equal(1, contributersCount);

        const amountContributed = await deployedCampaignContract.methods.contributers(contributer).call();
        assert.equal(1, amountContributed);
    });
    it('should have a minimum contribution limit', async () => {
        const contributer = accounts[3];
        try {
            await deployedCampaignContract.methods.contribute().send({ from: contributer, value: 0 });
            assert(false);
        } catch (error) {
            assert(true);
        }
    });

    //manager should be able to create requests
    it('manager should be able to create request for payment', async () => {

        const campaignManager = await deployedCampaignContract.methods.manager().call();

        const description = "description";
        await deployedCampaignContract.methods
            .createRequest(description, 1, accounts[9])
            .send({ from: campaignManager, gas: 1000000 });

        const request = await deployedCampaignContract.methods.requests(0).call();
        assert.equal(request.description, description);
    });

    it('should process requests', async () => {

        const contributers = [accounts[3], accounts[4]];
        const recipient = accounts[9];

        // 2 contributers, each 10 Ether
        await deployedCampaignContract.methods.contribute()
            .send({
                from: contributers[0],
                value: web3.utils.toWei('10', 'ether')
            });

        await deployedCampaignContract.methods.contribute()
            .send({
                from: contributers[1],
                value: web3.utils.toWei('10', 'ether')
            });


        // the manager creates a payment request
        const manager = await deployedCampaignContract.methods.manager().call();
        await deployedCampaignContract.methods
            .createRequest(
                "description",
                web3.utils.toWei('20', 'ether'),
                recipient
            ).send({ from: manager, gas: 1000000 });


        // contributers start to approve
        await deployedCampaignContract.methods.approveRequest(0)
            .send({
                from: contributers[0],
                gas: 1000000
            });

        // manager should not be able to finilize yet
        try {
            await deployedCampaignContract.methods.finilizeRequest(0)
                .send({
                    from: manager,
                    gas: 1000000
                });
            assert(false);
        } catch (error) {
            assert(true);
        }

        await deployedCampaignContract.methods.approveRequest(0)
            .send({
                from: contributers[1],
                gas: 1000000
            });

        //now manager should be able to finilize
        await deployedCampaignContract.methods.finilizeRequest(0)
            .send({
                from: manager,
                gas: 1000000
            });

        // accounts[9] should get the payment
        const recipientBalance = web3.utils.fromWei(await web3.eth.getBalance(recipient));
        const defaultBalance = 100;
        assert.equal(defaultBalance + 20, recipientBalance);
    });
});