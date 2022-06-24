// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract OwnershipByAccessControl is AccessControl {
    event OwnershipTransferred(address from, address to);
    address payable public owner;

    constructor () payable {
        owner = payable(msg.sender);
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
    }

    function transferOwnership(address to) external onlyRole(DEFAULT_ADMIN_ROLE){
        address from = _msgSender();
        _grantRole(DEFAULT_ADMIN_ROLE, to);
        _revokeRole(DEFAULT_ADMIN_ROLE, from);
        owner = payable(to);
        emit OwnershipTransferred(from, to);
    }
}