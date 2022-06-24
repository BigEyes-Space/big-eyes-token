// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./OwnershipByAccessControl.sol";

contract NativeTokenReceiver is OwnershipByAccessControl {
    event ReceivedWithEmptyCalldata(address from, uint value);
    event ReceivedByFallback(address from, uint value);

    receive() external payable {
        emit ReceivedWithEmptyCalldata(msg.sender, msg.value);
    }

    fallback() external payable {
        emit ReceivedByFallback(msg.sender, msg.value);
    }

    // Function to withdraw all Native tokens from this contract.
    function withdraw() external onlyRole(DEFAULT_ADMIN_ROLE) {
        // get the amount of Native tokens stored in this contract
        uint amount = address(this).balance;

        // send all Native tokens to owner
        // Owner can receive Native tokens since the address of owner is payable
        // solhint-disable-next-line avoid-low-level-calls
        (bool success, ) = owner.call{value: amount}("");
        require(success, "Failed to withdraw Ether");
    }
}
