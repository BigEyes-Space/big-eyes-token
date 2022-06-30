import { /* setupUsers, connectAndGetNamedAccounts, */ getNamedSigners } from '../src/signers'
import { getDeploymentArguments } from '../src/getDeploymentArguments'
import { BigNumber } from 'ethers'

// We import Chai to use its asserting functions here.
import { expect } from './utils/chai-setup'
import { ethers } from 'hardhat'

describe('TokenRecover contract', () => {
  beforeEach(async () => {
    await deployments.fixture(['BigEyes', 'UniswapV2Router02', 'UniswapV2Factory', 'UniswapV2Library', 'Bytes32Utils', 'ABDKMathQuad', 'RoundDiv', 'WETH', 'StringsLib'])
    this.bigEyes = await ethers.getContract('BigEyes')
    const aBDKMathQuadLibrary = await ethers.getContract('ABDKMathQuad')
    const router = await ethers.getContract('UniswapV2Router02')
    const namedSigners = await getNamedSigners()
    const name = 'Test Token'
    const symbol = 'TTO'
    const initialBalance = BigNumber.from('200000000000000000000000000000')
    Object.assign(this, namedSigners, await getDeploymentArguments({ ...namedSigners, router, aBDKMathQuadLibrary }))
    const TestToken = await ethers.getContractFactory('TestToken', this.deployer)
    this.testToken = await TestToken.deploy(name, symbol, this.deployer.address, initialBalance)
  })
  describe('Withdraw sent ERC20 tokens to the contract', async () => {
    let credit, defaultAdminRole
    beforeEach(async () => {
      credit = BigNumber.from('200000000000000000000000')
      await this.testToken.increaseAllowance(this.deployer.address, credit)
      await this.testToken.transfer(this.bigEyes.address, credit)
      defaultAdminRole = await this.bigEyes.DEFAULT_ADMIN_ROLE.call()
    })
    it('Admin should be entitled', async () => {
      const balanceBefore = await this.testToken.balanceOf(this.deployer.address)
      await this.bigEyes.connect(this.deployer).recoverERC20(this.testToken.address, credit)
      const balanceAfter = await this.testToken.balanceOf(this.deployer.address)
      const balanceCredit = balanceAfter.sub(balanceBefore)
      expect(balanceCredit).to.be.bignumber.equal(credit)
    })
    it('Non admin should not be entitled', async () => {
      await expect(this.bigEyes.connect(this.first).recoverERC20(this.testToken.address, credit))
        .to.be.revertedWith(`AccessControl: account ${this.first.address.toLowerCase()} is missing role ${defaultAdminRole}`)
    })
  })
})
