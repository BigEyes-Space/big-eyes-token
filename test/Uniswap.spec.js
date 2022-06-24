import { /* setupUsers, connectAndGetNamedAccounts, */ getNamedSigners } from '../src/signers'
import { getDeploymentArguments } from '../src/getDeploymentArguments'

// We import Chai to use its asserting functions here.
import { expect } from './utils/chai-setup'
import { ethers } from 'hardhat'
import { BigNumber, constants } from 'ethers'

const addLiquidity = async (self, supplier, amounts) => {
  const bigEyesAmount = amounts[0]
  const wETHAmount = amounts[1]
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

const swapExactTokensForTokens = async (self, liquiditySupply) => {
  const factor = 2000
  const depositValue = liquiditySupply[0].div(factor)
  await self.wETH
    .connect(self.second)
    .deposit({ value: depositValue })

  await self.wETH
    .connect(self.second)
    .approve(self.router.address, depositValue)

  const initialBalance = await self.bigEyes.balanceOf(self.second.address)
  const tradeAmounts = liquiditySupply.map(amount => amount.div(factor))
  const amountOfEthToSwap = tradeAmounts[0]
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

describe('Uniswap router contract', () => {
  beforeEach(async () => {
    await deployments.fixture(['BigEyes', 'UniswapV2Router02', 'UniswapV2Factory', 'UniswapV2Library', 'Bytes32Utils', 'ABDKMathQuad', 'SafeMath', 'RoundDiv', 'WETH', 'Strings', 'StringsLib'])
    this.factory = await ethers.getContract('UniswapV2Factory')
    this.bigEyes = await ethers.getContract('BigEyes')
    this.wETH = await ethers.getContract('WETH')
    const aBDKMathQuadLibrary = await ethers.getContract('ABDKMathQuad')
    this.router = await ethers.getContract('UniswapV2Router02')
    const namedSigners = await getNamedSigners()
    Object.assign(this, namedSigners, await getDeploymentArguments({ ...namedSigners, router: this.router, aBDKMathQuadLibrary }))
  })
  it('Should be able to add liquidity to uniswap contract', async () => {
    await addLiquidity(
      this,
      this.first,
      [ethers.utils.parseEther('1'), BigNumber.from('1000000000000000000')]
    )
  })
  describe('After liquidity supply', async () => {
    let liquiditySupply
    beforeEach(async () => {
      liquiditySupply = [ethers.utils.parseEther('1'), BigNumber.from('1000000000000000000')]
      await addLiquidity(
        this,
        this.first,
        liquiditySupply
      )
    })
    describe('A second user should be able to:', async () => {
      it('swap exact ETH for tokens', async () => {
        const initialBalance = await this.bigEyes.balanceOf(this.second.address)
        const tradeAmounts = liquiditySupply.map(amount => amount.div(2000))
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
        expect(endBalance).to.be.gt(initialBalance)
        // considering 0.3% fee and additional 0.1% slippage
        expect(endBalance).to.be.at.least(
          idealAmountOfBigEyesToReceive.sub(idealAmountOfBigEyesToReceive.mul(3 + 1).div(1000))
        )
      })
      it('swap exact tokens for tokens', async () => {
        const { initialBalance, endBalance, idealAmountOfBigEyesToReceive } = await swapExactTokensForTokens(this, liquiditySupply)
        expect(endBalance).to.be.gt(initialBalance)
        // considering 0.3% fee and additional 0.1% slippage
        expect(endBalance).to.be.at.least(
          idealAmountOfBigEyesToReceive.sub(idealAmountOfBigEyesToReceive.mul(3 + 1).div(1000))
        )
      })
    })
  })
})
