pragma solidity ^0.4.17;


contract factoryCampaign {
    address[] public deployedCampaigns;
    
    function createCampaign(uint256 minimum) public returns(address){
        address campaignAdmin = msg.sender;
        address newCampaign = new Campaign(minimum, campaignAdmin);
        deployedCampaigns.push(newCampaign);
    }
    
    function getDeployedContracts() public view returns(address[]){
        return deployedCampaigns;
    }
}


contract Campaign {
    
    struct Request {
        string description;
        uint value;
        address recipient;
        bool complete;
        uint approvalCount;
        mapping (address => bool) approvals;
    }
    
    Request[] public requests;
    address public manager;
    uint _minimuContribution;
    mapping(address => bool ) public contributers;    
    uint public contributersCount;

    modifier onlyManager() {
        require(msg.sender == manager);
        _;
    }
    
    function Campaign(uint256 minimum, address campaignAdmin) public {
        require(minimum > 0);
        manager = campaignAdmin;
        _minimuContribution = minimum;
    }
    
    function contribute() public payable {
        require(msg.value >= _minimuContribution);
        contributers[msg.sender] = true;
        contributersCount++;
    }
    
    function getMinimumContributionValue() public view returns (uint256) {
        return _minimuContribution;
    }

    function createRequest(
                            string description,
                            uint value,
                            address recipient
                            ) public onlyManager 
    {
        Request memory req =  Request({
            description:description,
            value : value,
            recipient : recipient,
            complete: false,
            approvalCount: 0
        });
        
        requests.push(req);
    }
    
    
    function approveRequest(uint index) public {
        Request storage req = requests[index];
        
        require(contributers[msg.sender]);
        require(!req.approvals[msg.sender]);
        
        req.approvals[msg.sender] = true;
        req.approvalCount++;
    }

    function finilizeRequest(uint index) public onlyManager {
        Request storage req = requests[index];
        require(!req.complete);
        
        require(req.approvalCount > (contributersCount / 2));
        req.recipient.transfer(req.value);
        req.complete = true;
    }
    
    function getBalance() public view returns (uint256){
        return this.balance;
    }
}