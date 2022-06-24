//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IRewardDistributor {
    function addRewardHolderShare(address rewardRecipient, uint256 amount) external;
}
