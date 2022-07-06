// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./BurnableReflectionERC20.sol";
import "./TokenRecover.sol";
import "./NativeTokenReceiver.sol";
// import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract BigEyes is BurnableReflectionERC20, TokenRecover, NativeTokenReceiver {
// contract BigEyes is ERC20Burnable, TokenRecover, NativeTokenReceiver {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor (
        string memory name,
        string memory symbol,
        address initialAccount,
        uint256 initialBalance,
        bytes16 slippageFactor, 
        address router_,
        uint256[] memory onBuyFees,
        uint256[] memory onSellFees
    ) payable ReflectionERC20(name, symbol, slippageFactor, router_, _msgSender(), onBuyFees, onSellFees) {
    // ) payable ERC20(name, symbol) {
        _mint(initialAccount, initialBalance);
    }

    function mint(address account, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(account, amount);
    }
}
