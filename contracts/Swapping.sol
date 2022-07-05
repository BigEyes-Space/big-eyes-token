// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract Swapping is AccessControl {
    bool private _inSwapAndLiquify;
    bool private _swapAndLiquifyEnabled = true;

    modifier lockTheSwap() {
        _inSwapAndLiquify = true;
        _;
        _inSwapAndLiquify = false;
    }

    event SwapAndLiquifyEnabledUpdated(bool enabled);

    function setSwapAndLiquifyEnabled(bool _enabled)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _swapAndLiquifyEnabled = _enabled;
        emit SwapAndLiquifyEnabledUpdated(_enabled);
    }

    function isSwapAndLiquifyEnabled() internal view returns (bool) {
        return _swapAndLiquifyEnabled;
    }

    function isSwapping() internal view returns (bool) {
        return _inSwapAndLiquify;
    }
}
