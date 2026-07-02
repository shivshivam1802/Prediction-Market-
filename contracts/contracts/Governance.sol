// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Governance is Ownable {
    // Events
    event ProposalCreated(uint256 indexed proposalId, string description, uint256 votingDeadline);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);

    struct Proposal {
        uint256 id;
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 votingDeadline;
        bool executed;
        mapping(address => bool) hasVoted;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    
    // Simple governance token tracking
    mapping(address => uint256) public votingPower;

    constructor() Ownable(msg.sender) {
        // Mint initial power to creator for bootstrap
        votingPower[msg.sender] = 1000 * 1e18; 
    }

    function grantVotingPower(address user, uint256 amount) external onlyOwner {
        votingPower[user] += amount;
    }

    function createProposal(string calldata description, uint256 duration) external returns (uint256) {
        require(votingPower[msg.sender] > 0, "Governance: Only token holders can propose");
        
        proposalCount++;
        Proposal storage p = proposals[proposalCount];
        p.id = proposalCount;
        p.description = description;
        p.votingDeadline = block.timestamp + duration;
        p.executed = false;

        emit ProposalCreated(proposalCount, description, p.votingDeadline);
        return proposalCount;
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];
        require(block.timestamp < p.votingDeadline, "Governance: Voting ended");
        require(!p.hasVoted[msg.sender], "Governance: Already voted");
        
        uint256 weight = votingPower[msg.sender];
        require(weight > 0, "Governance: No voting power");

        p.hasVoted[msg.sender] = true;
        if (support) {
            p.votesFor += weight;
        } else {
            p.votesAgainst += weight;
        }

        emit Voted(proposalId, msg.sender, support, weight);
    }

    function executeProposal(uint256 proposalId) external onlyOwner {
        Proposal storage p = proposals[proposalId];
        require(block.timestamp >= p.votingDeadline, "Governance: Voting active");
        require(!p.executed, "Governance: Already executed");
        require(p.votesFor > p.votesAgainst, "Governance: Proposal rejected");

        p.executed = true;
        emit ProposalExecuted(proposalId);
    }
}
