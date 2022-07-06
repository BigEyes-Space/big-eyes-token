// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./ERC20Metadata.sol";
import "./Swapping.sol";
import "./RoundDiv.sol";
import "./CalculateAmountOutMin.sol";

struct ReflectionAccountability {
    uint256 tTotal;
    uint256 rTotal;
    uint256 maxTxAmount;
    uint256 numTokensSellToAddToLiquidity;
    uint256 tFeeTotal;
}

struct ReflectionParameters{
    uint256 factor;
    uint256 maxTxFactor;
    uint256 liquidityFactor;
    uint256 maxTotalSupply;
}

struct Fees {
    uint256 liquidity;
    uint256 marketing;
    uint256 distribution;
}

contract ReflectionERC20 is IERC20, ERC20Metadata, Context, CalculateAmountOutMin, Swapping {
    using SafeMath for uint256;
    using RoundDiv for uint256;

    mapping(address => uint256) private _reflectionOwned;
    mapping(address => uint256) private _tokenOwned;


    
    mapping(address => mapping(address => uint256)) private _allowances;

    mapping(address => bool) private _isExcludedFromFee;

    mapping(address => bool) private _isExcluded;
    mapping(address => bool) public isFirstBuy;
    address[] private _excluded;

    uint256 private constant _MAX = ~uint256(0);
    // uint256 private constant _FEE_DIVISOR = 1000;
    uint256 private _feeMultiplier;
    uint256 private _feeDivisor;

    uint256 public launchedAt;

    address public marketingWallet;
    address private _autoLiquidityReceiver;

    Fees public onBuyFees;
    Fees public onSellFees;

    ReflectionAccountability public reflectionAccountability;
    ReflectionParameters private reflection;

    event SetIsExcludedFromFee(address indexed account, bool indexed flag);
    event IncludeInReflection(address indexed account);
    event ExcludeFromReflection(address indexed account);
    event UpdateMarketingWallet(address indexed marketingWallet);
    event ChangeFeesForNormalSell(uint256 indexed liquidityFeeOnSell, uint256 indexed marketingFeeOnSell, uint256 indexed bigEyesDistributionFeeOnSell);
    event ChangeFeesForNormalBuy(uint256 indexed liquidityFeeOnBuy, uint256 indexed marketingFeeOnBuy, uint256 indexed bigEyesDistributionFeeOnBuy);
    event UpdateUniSwapRouter(address indexed dexRouter);

    event SwapAndLiquify(uint256 indexed ethReceived, uint256 indexed tokensIntoLiqudity);

    constructor(
        string memory name_,
        string memory symbol_,
        bytes16 slippageFactor_, 
        address router_, 
        address marketingWallet_,
        uint256[] memory onBuyFees_,
        uint256[] memory onSellFees_,
        uint256 feeMultiplier_
        ) CalculateAmountOutMin(slippageFactor_, router_)
        ERC20Metadata(name_, symbol_, 9) {

        onBuyFees.liquidity = onBuyFees_[0];
        onBuyFees.marketing = onBuyFees_[1];
        onBuyFees.distribution = onBuyFees_[2];

        onSellFees.liquidity = onSellFees_[0];
        onSellFees.marketing = onSellFees_[1];
        onSellFees.distribution = onSellFees_[2];
        
        reflection.maxTxFactor = 200;
        reflection.liquidityFactor = 2000;
        reflection.factor = 2**128;
        reflection.maxTotalSupply = _MAX / reflection.factor;    


        // TOCHECK
        marketingWallet = marketingWallet_;
        
        _isExcludedFromFee[msg.sender] = true;
        _isExcludedFromFee[address(this)] = true;
        _isExcludedFromFee[address(0)] = true;
        _isExcludedFromFee[marketingWallet] = true;

        if (/*lockLiquidityForever_*/ true) {
            _autoLiquidityReceiver = address(0);
        } else {
            _autoLiquidityReceiver = address(this);
        }

        _feeMultiplier = feeMultiplier_;
        _feeDivisor = 100*_feeMultiplier;
    }

    function excludeFromReflection(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _excludeFromReflection(account);
        emit ExcludeFromReflection(account);
    }

    function includeInReflection(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _includeInReflection(account);
        emit IncludeInReflection(account);
    }

    function setIsExcludedFromFee(address account, bool flag) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setIsExcludedFromFee(account, flag);
        emit SetIsExcludedFromFee(account, flag);
    }

    function totalSupply() external view override returns (uint256) {
        return reflectionAccountability.tTotal;
    }

    function balanceOf(address account) public view override returns (uint256) {
        if (reflectionAccountability.tTotal == 0) return 0;
        if (_isExcluded[account]) return _tokenOwned[account];
        return tokenFromReflection(_reflectionOwned[account]);
    }

    function isExcludedFromReflection(address account) external view returns (bool) {
        return _isExcluded[account];
    }

    function totalFees() external view returns (uint256) {
        return reflectionAccountability.tFeeTotal;
    }

    function reflectionFromToken(uint256 tAmount) public view returns (uint256) {
        uint256 reflectionAmount = tAmount * _getRate();
        return reflectionAmount;
    }

    function tokenFromReflection(uint256 reflectionAmount) public view returns (uint256) {
        require(reflectionAmount <= reflectionAccountability.rTotal, "Amount must be < reflections");
        return reflectionAmount.roundDiv(_getRate());
    }

    function getTotalCommunityReflection() external view returns (uint256) {
        return reflectionAccountability.tFeeTotal;
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function transfer(address recipient, uint256 amount) external override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external override returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(
            sender,
            _msgSender(),
            _allowances[sender][_msgSender()].sub(amount, "ERC20: transfer amount exceeds allowance"));
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) external virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender] + addedValue);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) external virtual returns (bool) {
        _approve(
            _msgSender(),
            spender,
            _allowances[_msgSender()][spender].sub(subtractedValue, "ERC20: decreased allowance below zero"));
        return true;
    }



    // Requirements
    // 
    //

    function _approve(address owner, address spender, uint256 amount) private {
        require(owner != address(0), "ERC20: approve from 0x address");
        require(spender != address(0), "ERC20: approve to 0x address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _transfer(address sender, address recipient, uint256 amount) private {
        // require(sender != address(0), "ERC20: transfer from 0x address");
        // require(recipient != address(0), "ERC20: transfer to 0x address");
        require(amount > 0, "ERC20: amount must be > 0");

        _beforeTokenTransfer(sender, recipient, amount);

        if (isSwapping()) {
            _basicTransfer(sender, recipient, amount);
            _afterTokenTransfer(sender, recipient, amount);
            return;
        }

        if (_shouldSwapBack())
            _swapAndAddToLiquidity();

        address dexPairAddress = address(dexPair);
        if (_isExcludedFromFee[sender] || _isExcludedFromFee[recipient]) {
            _basicTransfer(sender, recipient, amount);
        } else {
            if (recipient == dexPairAddress) {
                _normalSell(sender, recipient, amount);
            } else if (sender == dexPairAddress) {
                if (isFirstBuy[recipient]) {
                    isFirstBuy[recipient] = false;
                }
                _normalBuy(sender, recipient, amount);
            } else {
                _basicTransfer(sender, recipient, amount);
            }
        }

        if (launchedAt == 0 && recipient == dexPairAddress) {
            launchedAt = block.number;
        }

        _afterTokenTransfer(sender, recipient, amount);
    }

    function _basicTransfer(address sender, address recipient, uint256 amount) private {
        uint256 currentRate = _getRate();
        updateBalance(sender, amount, currentRate, false);
        updateBalance(recipient, amount, currentRate, true);        
        emit Transfer(sender, recipient, amount);
    }

    function _normalBuy(address sender, address recipient, uint256 amount) private {
        uint256 currentRate = _getRate();
        uint256 liquidityFee = (amount * onBuyFees.liquidity).roundDiv(_feeDivisor);
        uint256 distributionFee = (amount * onBuyFees.distribution).roundDiv(_feeDivisor);
        uint256 marketingFee = (amount * onBuyFees.marketing).roundDiv(_feeDivisor);
        uint256 transferAmount = amount - liquidityFee - distributionFee - marketingFee;
        updateBalance(sender, amount, currentRate, false);
        updateBalance(recipient, transferAmount, currentRate, true);
        updateBalance(address(this), liquidityFee, currentRate, true);
       
        emit Transfer(sender, recipient, transferAmount);
        emit Transfer(sender, address(this), liquidityFee);

        updateBalance(marketingWallet, marketingFee, currentRate, true);
        emit Transfer(sender, marketingWallet, marketingFee);
        _reflectFee(distributionFee*currentRate, distributionFee);
    }

    function _normalSell(address sender, address recipient, uint256 amount) private {
        uint256 currentRate = _getRate();
        uint256 liquidityFee = (amount * onSellFees.liquidity).roundDiv(_feeDivisor);
        uint256 distributionFee = (amount * onSellFees.distribution).roundDiv(_feeDivisor);
        uint256 marketingFee = (amount * onSellFees.marketing).roundDiv(_feeDivisor);
        uint256 transferAmount = amount - liquidityFee - distributionFee - marketingFee;

        updateBalance(sender, amount, currentRate, false);
        updateBalance(recipient, transferAmount, currentRate, true);
        updateBalance(address(this), liquidityFee, currentRate, true);
       
        emit Transfer(sender, recipient, transferAmount);
        emit Transfer(sender, address(this), liquidityFee);

        updateBalance(marketingWallet, marketingFee, currentRate, true);
        emit Transfer(sender, marketingWallet, marketingFee);
        _reflectFee(distributionFee*currentRate, distributionFee);
    }

    function _shouldSwapBack() private view returns (bool) {
        return msg.sender != address(dexPair)
            && launchedAt > 0
            && !isSwapping()
            && isSwapAndLiquifyEnabled()
            && balanceOf(address(this)) >= reflectionAccountability.numTokensSellToAddToLiquidity;
    }

    function _swapAndAddToLiquidity() private lockTheSwap {
        uint256 tokenAmountForLiquidity = reflectionAccountability.numTokensSellToAddToLiquidity;
        uint256 amountToSwap = tokenAmountForLiquidity.roundDiv(2);
        uint256 amountAnotherHalf = tokenAmountForLiquidity - amountToSwap;

        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = dexRouter.WETH();

        uint256 balanceBefore = address(this).balance;

        dexRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
            amountToSwap,
            this._calculateAmountOutMin(path, amountToSwap),
            path,
            address(this),
            // solhint-disable-next-line not-rely-on-time
            block.timestamp + 30
        );

        uint256 difference = address(this).balance - balanceBefore;

        dexRouter.addLiquidityETH{value: difference} (
            address(this),
            amountAnotherHalf,
            0,
            0,
            _autoLiquidityReceiver,
            // solhint-disable-next-line not-rely-on-time
            block.timestamp + 30
        );

        emit SwapAndLiquify(difference, amountToSwap);
    }

    function _getRate() private view returns (uint256) {
        (uint256 reflectionSupply, uint256 tokenSupply) = _getCurrentSupply();
        return reflectionSupply.roundDiv(tokenSupply);
    }

    // function _sendToMarketingWallet(address sender, uint256 tMarketingFee, uint256 reflectionMarketingFee) private {
    //     _reflectionOwned[marketingWallet] = _reflectionOwned[marketingWallet] + reflectionMarketingFee;
    //     emit Transfer(sender, marketingWallet, tMarketingFee);
    // }

    function _reflectFee(uint256 reflectionFee, uint256 tokenFee) private {
        reflectionAccountability.rTotal = reflectionAccountability.rTotal - reflectionFee;
        reflectionAccountability.tFeeTotal = reflectionAccountability.tFeeTotal + tokenFee;
    }
    
    function _getCurrentSupply() private view returns (uint256, uint256) {
        uint256 reflectionSupply = reflectionAccountability.rTotal;
        uint256 tokenSupply = reflectionAccountability.tTotal;
        for (uint256 i = 0; i < _excluded.length; i++) {
            if (_reflectionOwned[_excluded[i]] > reflectionSupply || _tokenOwned[_excluded[i]] > tokenSupply)
                return (reflectionAccountability.rTotal, reflectionAccountability.tTotal);

            reflectionSupply = reflectionSupply - _reflectionOwned[_excluded[i]];
            tokenSupply = tokenSupply - _tokenOwned[_excluded[i]];
        }

        if (reflectionSupply < reflectionAccountability.rTotal.roundDiv(reflectionAccountability.tTotal)) {
            return (reflectionAccountability.rTotal, reflectionAccountability.tTotal);
        }

        return (reflectionSupply, tokenSupply);
    }

    function _excludeFromReflection(address account) private {
        require(account !=  address(dexRouter), "UniSwap router can not be excluded!");
        require(!_isExcluded[account], "Account is already excluded");

        if (_reflectionOwned[account] > 0) {
            _tokenOwned[account] = tokenFromReflection(_reflectionOwned[account]);
        }
        _isExcluded[account] = true;
        _excluded.push(account);
    }

    function _includeInReflection(address account) private {
        require(_isExcluded[account], "Account is already included");
        for (uint256 i = 0; i < _excluded.length; i++) {
            if (_excluded[i] == account) {
                uint256 prev_reflection=_reflectionOwned[account];
                _reflectionOwned[account] = reflectionFromToken(_tokenOwned[account]);
                reflectionAccountability.rTotal = reflectionAccountability.rTotal + _reflectionOwned[account] - prev_reflection;
                _isExcluded[account] = false;
                _excluded[i] = _excluded[_excluded.length - 1];
                _excluded.pop();
                break;
            }
        }
    }

    function _setIsExcludedFromFee(address account, bool flag) private {
        _isExcludedFromFee[account] = flag;
    }

    function changeFeesForNormalBuy(uint256 _liquidityFeeOnBuy, uint256 _marketingFeeOnBuy, uint256 _bigEyesDistributionFeeOnBuy) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_liquidityFeeOnBuy < 100, "Fee should be less than 100!");
        require(_marketingFeeOnBuy < 100, "Fee should be less than 100!");
        require(_bigEyesDistributionFeeOnBuy < 100, "Fee should be less than 100!");
        onBuyFees.liquidity = _liquidityFeeOnBuy;
        onBuyFees.marketing = _marketingFeeOnBuy;
        onBuyFees.distribution = _bigEyesDistributionFeeOnBuy;
        emit ChangeFeesForNormalBuy(_liquidityFeeOnBuy, _marketingFeeOnBuy, _bigEyesDistributionFeeOnBuy);
    }

    function changeFeesForNormalSell(uint256 _liquidityFeeOnSell, uint256 _marketingFeeOnSell, uint256 _bigEyesDistributionFeeOnSell) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_liquidityFeeOnSell < 100, "Fee should be less than 100!");
        require(_marketingFeeOnSell < 100, "Fee should be less than 100!");
        require(_bigEyesDistributionFeeOnSell < 100, "Fee should be less than 100!");
        onSellFees.liquidity = _liquidityFeeOnSell;
        onSellFees.marketing = _marketingFeeOnSell;
        onSellFees.distribution = _bigEyesDistributionFeeOnSell;
        emit ChangeFeesForNormalSell(_liquidityFeeOnSell, _marketingFeeOnSell, _bigEyesDistributionFeeOnSell);
    }

    function updateMarketingWallet(address _marketingWallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_marketingWallet != address(0), "Zero address not allowed!");
        _isExcludedFromFee[marketingWallet] = false;
        marketingWallet = _marketingWallet;
        _isExcludedFromFee[marketingWallet] = true;
        _excludeFromReflection(marketingWallet);
        emit UpdateMarketingWallet(_marketingWallet);
    }

    function updateUniSwapRouter(address dexRouter_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(dexRouter_ != address(0), "UniSwap Router Invalid!");
        require(address(dexRouter) != dexRouter_, "UniSwap Router already exists!");
        _allowances[address(this)][dexRouter_] = 0; // Set Allowance to 0
        _setDex(dexRouter_);
        _allowances[address(this)][dexRouter_] = _MAX;
        emit UpdateUniSwapRouter(dexRouter_);
    }

    /** @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     */
    function _mint(address account, uint256 amount) internal virtual {
        require(amount + reflectionAccountability.tTotal <= reflection.maxTotalSupply, "ERC20: Exceeds max limit");
        require(account != address(0), "ERC20: mint to the zero address");
        require(amount > 0, "ERC20: amount is zero");

        _beforeTokenTransfer(address(0), account, amount);

        uint256 rMintAmount = amount * reflection.factor;

        reflectionAccountability.tTotal = reflectionAccountability.tTotal + amount;
        reflectionAccountability.rTotal = reflectionAccountability.rTotal + rMintAmount;
        reflectionAccountability.maxTxAmount = reflectionAccountability.tTotal.roundDiv(reflection.maxTxFactor);
        reflectionAccountability.numTokensSellToAddToLiquidity = reflectionAccountability.tTotal.roundDiv(reflection.liquidityFactor);

        _reflectionOwned[account] = _reflectionOwned[account] + rMintAmount;
        
        emit Transfer(address(0), account, amount);

        _afterTokenTransfer(address(0), account, amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`, reducing the
     * total supply.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     * - `account` must have at least `amount` tokens.
     */
    function _burn(address account, uint256 amount) internal virtual {
        require(balanceOf(account) >= amount, "ERC20: burn amount is exceeded");
        require(account != address(0), "ERC20: burn from the 0x address");
        require(amount > 0, "ERC20: amount is zero");

        _beforeTokenTransfer(account, address(0), amount);

        uint256 rBurnAmount = amount * reflection.factor;

        reflectionAccountability.tTotal = reflectionAccountability.tTotal - amount;
        reflectionAccountability.rTotal = reflectionAccountability.rTotal - rBurnAmount;
        reflectionAccountability.maxTxAmount = reflectionAccountability.tTotal.roundDiv(reflection.maxTxFactor);
        reflectionAccountability.numTokensSellToAddToLiquidity = reflectionAccountability.tTotal.roundDiv(reflection.liquidityFactor);

        _reflectionOwned[account] = _reflectionOwned[account] - rBurnAmount;

        emit Transfer(account, address(0), amount);

        _afterTokenTransfer(account, address(0), amount);
    }

    /**
     * @dev Updates `owner` s allowance for `spender` based on spent `amount`.
     *
     * Does not update the allowance amount in case of infinite allowance.
     * Revert if not enough allowance is available.
     *
     * Might emit an {Approval} event.
     */
    function _spendAllowance(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        uint256 currentAllowance = _allowances[owner][spender];
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "ERC20: insufficient allowance");
            unchecked {
                _approve(owner, spender, currentAllowance - amount);
            }
        }
    }

    /**
     * @dev Hook that is called before any transfer of tokens. This includes
     * minting and burning.
     *
     * Calling conditions:
     *
     * - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
     * will be transferred to `to`.
     * - when `from` is zero, `amount` tokens will be minted for `to`.
     * - when `to` is zero, `amount` of ``from``'s tokens will be burned.
     * - `from` and `to` are never both zero.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {}

    /**
     * @dev Hook that is called after any transfer of tokens. This includes
     * minting and burning.
     *
     * Calling conditions:
     *
     * - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
     * has been transferred to `to`.
     * - when `from` is zero, `amount` tokens have been minted for `to`.
     * - when `to` is zero, `amount` of ``from``'s tokens have been burned.
     * - `from` and `to` are never both zero.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {}

    function updateBalance(address holder, uint256 amount, uint256 currentRate, bool isAdd) internal {
        if(isAdd){
            _reflectionOwned[holder] = _reflectionOwned[holder] + amount*currentRate;
            if (_isExcluded[holder])
                _tokenOwned[holder]=_tokenOwned[holder]+amount;
        }else{
            _reflectionOwned[holder] = _reflectionOwned[holder] - amount*currentRate;
            if (_isExcluded[holder])
                _tokenOwned[holder]=_tokenOwned[holder]-amount;
        }
        
    }
}