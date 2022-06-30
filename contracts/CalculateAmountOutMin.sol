// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./abdk-libraries-solidity/ABDKMathQuad.sol";
import { IUniswapV2Pair } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import { IUniswapV2Router02 } from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import { IUniswapV2Factory } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "./OwnershipByAccessControl.sol";

contract CalculateAmountOutMin is OwnershipByAccessControl {
    using ABDKMathQuad for bytes16;

    bytes16 private _maxPremium;
    bytes16 private _slippageFactor;

    IUniswapV2Router02 internal dexRouter;
    IUniswapV2Pair internal dexPair;

    constructor(bytes16 slippageFactor_, address router_) {
        _setSlippageFactor(slippageFactor_);
        _setDex(router_);
    }

    function _setDex(address router_) internal {
        dexRouter = _getRouter(router_);
        dexPair = _createPair(router_);
    }

    function setSlippageFactor(bytes16 slippageFactor_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setSlippageFactor(slippageFactor_);
    }

    function _setSlippageFactor(bytes16 slippageFactor_) private {
        _slippageFactor = slippageFactor_;
    }

    function _setMaxPremium(bytes16 maxPremium_) private {
        _maxPremium = maxPremium_;
    }

    function _calculateLastExecutedPrice() private view returns (bytes16, uint32) {
        (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast) = dexPair.getReserves();
        return (ABDKMathQuad.fromUInt(uint256(reserve1)).div(ABDKMathQuad.fromUInt(uint256(reserve0))), blockTimestampLast);
    }

    function _calculateAmountOutMin(address[] memory path, uint256 amount) public view returns (uint256) {
        uint256[] memory amountsOut = dexRouter.getAmountsOut(amount, path);
        return ABDKMathQuad.toUInt(ABDKMathQuad.fromUInt(amountsOut[1]).mul(_slippageFactor));
    }

    function _getRouter(address router) private pure returns(IUniswapV2Router02) {
        return IUniswapV2Router02(router);
    }

    function _createPair(address router_) private returns(IUniswapV2Pair) {
        IUniswapV2Router02 router = _getRouter(router_);
        return IUniswapV2Pair(IUniswapV2Factory(router.factory()).createPair(address(this), router.WETH()));
    }
}