import { /* setupUsers, connectAndGetNamedAccounts, */ getNamedSigners } from '../src/signers'
import { getDeploymentArguments } from '../src/getDeploymentArguments'

// We import Chai to use its asserting functions here.
import { expect } from './utils/chai-setup'
import { ethers } from 'hardhat'

const tests = () => {
  it('Admin should be entitled to withdraw sent ethers to the contract', async () => {
    const balanceBefore = await ethers.provider.getBalance(this.deployer.address)
    await this.bigEyes.connect(this.deployer).withdraw()
    const balanceAfter = await ethers.provider.getBalance(this.deployer.address)
    const balanceCredit = balanceAfter.sub(balanceBefore)
    expect(balanceCredit).to.be.bignumber.above(this.credit.sub(this.margin))
  })
  it('Non admin should not be entitled to withdraw sent ethers to the contract', async () => {
    const defaultAdminRole = await this.bigEyes.DEFAULT_ADMIN_ROLE.call()
    await expect(this.bigEyes.connect(this.first).withdraw())
      .to.be.revertedWith(`AccessControl: account ${this.first.address.toLowerCase()} is missing role ${defaultAdminRole}`)
  })
}

const sendWithEmptyCalldata = () => {
  return this.first.sendTransaction({
    to: this.bigEyes.address,
    value: this.credit
  })
}

const sendByFallback = () => {
  const nonExistentFuncSignature = 'nonExistentFunc(uint256,uint256)'
  const fakeDemoContract = new ethers.Contract(
    this.bigEyes.address,
    [
      ...this.bigEyes.interface.fragments,
      `function ${nonExistentFuncSignature} payable`
    ],
    this.first
  )
  const tx = fakeDemoContract[nonExistentFuncSignature](0, 0, { value: this.credit })
  return tx
}

describe('NativeTokenReceiver contract', () => {
  beforeEach(async () => {
    await deployments.fixture(['BigEyes', 'UniswapV2Router02', 'UniswapV2Factory', 'UniswapV2Library', 'Bytes32Utils', 'ABDKMathQuad', 'RoundDiv', 'WETH', 'StringsLib'])
    this.bigEyes = await ethers.getContract('BigEyes')
    const aBDKMathQuadLibrary = await ethers.getContract('ABDKMathQuad')
    const router = await ethers.getContract('UniswapV2Router02')
    const namedSigners = await getNamedSigners()
    Object.assign(this, namedSigners, await getDeploymentArguments({ ...namedSigners, router, aBDKMathQuadLibrary }))
    this.credit = ethers.utils.parseEther('1.0')
    this.margin = ethers.utils.parseEther('0.1')
  })
  it('Should emit ReceivedWithEmptyCalldata', async () => {
    await expect(sendWithEmptyCalldata())
      .to.emit(this.bigEyes, 'ReceivedWithEmptyCalldata')
      .withArgs(this.first.address, this.credit)
  })
  it('Should emit ReceivedByFallback', async () => {
    await expect(sendByFallback())
      .to.emit(this.bigEyes, 'ReceivedByFallback')
      .withArgs(this.first.address, this.credit)
  })
  describe('Received with empty calldata', async () => {
    beforeEach(async () => {
      await sendWithEmptyCalldata()
    })
    tests()
  })
  describe('Received by fallback', async () => {
    beforeEach(async () => {
      await sendByFallback()
    })
    tests()
  })
})
