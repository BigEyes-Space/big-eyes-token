// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title TokenRecover
 * @dev Allows owner to recover any ERC20 sent into the contract
 */
contract TokenRecover is AccessControl {
    /**
     * @dev Remember that only owner can call so be careful when use on contracts generated from other contracts.
     * @param tokenAddress The token contract address
     * @param tokenAmount Number of tokens to be sent
     */
    function recoverERC20(address tokenAddress, uint256 tokenAmount) public virtual onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(tokenAddress).transfer(_msgSender(), tokenAmount);
    }
}