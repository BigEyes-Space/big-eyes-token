import { /* setupUsers, connectAndGetNamedAccounts, */ getNamedSigners } from '../src/signers'
import { getDeploymentArguments } from '../src/getDeploymentArguments'

// We import Chai to use its asserting functions here.
import { expect } from './utils/chai-setup'
import { ethers } from 'hardhat'
import { constants } from 'ethers'

const feesReduction = (self, theArray) => theArray.reduce((total, num) => total + num / 100 / self.feeMultiplier, 0)

const addLiquidity = async (self, supplier, amounts) => {
  const wETHAmount = amounts[0]
  const bigEyesAmount = amounts[1]
  await self.bigEyes
    .connect(self.deployer)
    .transfer(supplier.address, bigEyesAmount)

  await self.wETH
    .connect(supplier)
    .deposit({ value: wETHAmount })

  await self.bigEyes
    .connect(supplier)
    .approve(self.router.address, bigEyesAmount)

  await self.wETH
    .connect(supplier)
    .approve(self.router.address, wETHAmount)

  await self.router
    .connect(supplier)
    .addLiquidity(
      self.bigEyes.address,
      self.wETH.address,
      bigEyesAmount,
      wETHAmount,
      0,
      0,
      supplier.address,
      constants.MaxUint256
    )
}

const getTradeAmounts = (liquiditySupply) => {
  const factor = 2000
  const tradeAmounts = liquiditySupply.map(amount => amount.div(factor))
  return { tradeAmounts }
}

const swapExactTokensForTokens = async (self, liquiditySupply) => {
  const { tradeAmounts } = getTradeAmounts(liquiditySupply)
  const depositValue = tradeAmounts[0]
  await self.wETH
    .connect(self.second)
    .deposit({ value: depositValue })

  await self.wETH
    .connect(self.second)
    .approve(self.router.address, depositValue)

  const initialBalance = await self.bigEyes.balanceOf(self.second.address)
  const amountOfEthToSwap = depositValue
  const idealAmountOfBigEyesToReceive = tradeAmounts[1]
  await self.router.connect(self.second).swapExactTokensForTokens(
    amountOfEthToSwap, // amountIn
    0, // amountOutMin
    [self.wETH.address, self.bigEyes.address], // path
    self.second.address, // to
    constants.MaxUint256 // deadline
  )
  const endBalance = await self.bigEyes.balanceOf(self.second.address)
  return { initialBalance, endBalance, idealAmountOfBigEyesToReceive }
}

const deductionsCheck = (endBalance, initialBalance, idealAmountOfBigEyesToReceive) => {
  expect(endBalance).to.be.gt(initialBalance)

  const expectedDeduction = idealAmountOfBigEyesToReceive.toNumber() * (1 - (1 - this.uniSwapFee) * (1 - this.slippageFactor) * (1 - this.accumulatedOnBuyFees) * (1 - this.accumulatedOnSellFees))
  const deduction = idealAmountOfBigEyesToReceive.sub(endBalance)

  // const slippageFactor = 1 - ( 1 - deduction.toNumber()/idealAmountOfBigEyesToReceive.toNumber())/(1 - this.uniSwapFee)/(1 - this.accumulatedOnBuyFees)/(1 - this.accumulatedOnSellFees)
  // console.log(slippageFactor)

  const error = expectedDeduction - deduction.toNumber()
  const errorRatio = error / deduction.toNumber()
  // console.log(`Error ${errorRatio*100} %`)
  expect(Math.abs(errorRatio)).to.be.lessThan(1e-6)
}

describe('Uniswap router contract', () => {
  beforeEach(async () => {
    await deployments.fixture(['BigEyes', 'UniswapV2Router02', 'UniswapV2Factory', 'UniswapV2Library', 'Bytes32Utils', 'ABDKMathQuad', 'RoundDiv', 'WETH', 'StringsLib'])
    this.factory = await ethers.getContract('UniswapV2Factory')
    this.bigEyes = await ethers.getContract('BigEyes')
    this.wETH = await ethers.getContract('WETH')
    const aBDKMathQuadLibrary = await ethers.getContract('ABDKMathQuad')
    this.router = await ethers.getContract('UniswapV2Router02')
    const namedSigners = await getNamedSigners()
    const deploymentArgs = await getDeploymentArguments({ ...namedSigners, router: this.router, aBDKMathQuadLibrary })
    this.liquiditySupply = [ethers.utils.parseEther('1'), deploymentArgs.initialBalance.div(888)]
    Object.assign(this, namedSigners, deploymentArgs)
  })
  it('Should be able to add liquidity to uniswap contract', async () => {
    await addLiquidity(
      this,
      this.first,
      this.liquiditySupply
    )
  })
  describe('After liquidity supply', async () => {
    beforeEach(async () => {
      await addLiquidity(
        this,
        this.first,
        this.liquiditySupply
      )
      // considering 0.3% fee and additional 0.04914965285134354% slippage
      this.slippageFactor = 0.0004914965285134354
      this.uniSwapFee = 0.003
      this.accumulatedOnBuyFees = feesReduction(this, this.onBuyFees)
      this.accumulatedOnSellFees = feesReduction(this, this.onSellFees)
    })
    describe('A second user should be able to:', async () => {
      it('swap exact ETH for tokens', async () => {
        const { tradeAmounts } = getTradeAmounts(this.liquiditySupply)
        const initialBalance = await this.bigEyes.balanceOf(this.second.address)
        const amountOfEthToSwap = tradeAmounts[0]
        const idealAmountOfBigEyesToReceive = tradeAmounts[1]
        await this.router.connect(this.second).swapExactETHForTokens(
          0, // amountOutMin
          [this.wETH.address, this.bigEyes.address], // path
          this.second.address, // to
          constants.MaxUint256, // deadline
          { value: amountOfEthToSwap }
        )
        const endBalance = await this.bigEyes.balanceOf(this.second.address)
        deductionsCheck(endBalance, initialBalance, idealAmountOfBigEyesToReceive)
      })
      it('swap exact tokens for tokens', async () => {
        const { initialBalance, endBalance, idealAmountOfBigEyesToReceive } = await swapExactTokensForTokens(this, this.liquiditySupply)
        deductionsCheck(endBalance, initialBalance, idealAmountOfBigEyesToReceive)
      })
    })
  })
})
