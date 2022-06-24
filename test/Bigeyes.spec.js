import { /* setupUsers, connectAndGetNamedAccounts, */ getNamedSigners } from '../src/signers'
import { getDeploymentArguments } from '../src/getDeploymentArguments'
import { getDeploymentArgumentsForNFTs } from '../src/getDeploymentArgumentsForNFTs'

// We import Chai to use its asserting functions here.
import { expect } from './utils/chai-setup'
import { BigNumber } from 'ethers'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const getRandomNumber = () => {
  return getRandomNumberBetween(0, Number.MAX_SAFE_INTEGER)
}

function getRandomNumberBetween (min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

describe('BigEyes contract', () => {
  beforeEach(async () => {
    await deployments.fixture(['BigEyes', 'BigEyesNFTs', 'UniswapV2Router02', 'UniswapV2Factory', 'UniswapV2Library', 'Bytes32Utils', 'ABDKMathQuad', 'SafeMath', 'RoundDiv', 'WETH', 'Strings', 'StringsLib'])
    this.bigEyes = await ethers.getContract('BigEyes')
    this.bigEyesNFTs = await ethers.getContract('BigEyesNFTs')
    const aBDKMathQuadLibrary = await ethers.getContract('ABDKMathQuad')
    const router = await ethers.getContract('UniswapV2Router02')
    const namedSigners = await getNamedSigners()
    Object.assign(
      this,
      namedSigners,
      await getDeploymentArguments({ ...namedSigners, router, aBDKMathQuadLibrary }),
      await getDeploymentArgumentsForNFTs({ ...namedSigners, bigEyes: this.bigEyes })
    )
  })
  it('Should be able to transfer BigEyes tokens', async () => {
    const amountToTransfer = this.initialBalance
    await this.bigEyes.connect(this.deployer).transfer(this.first.address, amountToTransfer)
    expect(await this.bigEyes.balanceOf(this.deployer.address))
      .to.be.equal(0)
    expect(await this.bigEyes.balanceOf(this.first.address))
      .to.be.equal(amountToTransfer)
  })
  describe('Grant minter role', async () => {
    let defaultAdminRole
    beforeEach(async () => {
      defaultAdminRole = await this.bigEyes.DEFAULT_ADMIN_ROLE.call()
    })
    it('Admin should entitled', async () => {
      const minterRole = await this.bigEyes.MINTER_ROLE.call()
      await expect(this.bigEyes.connect(this.deployer).grantRole(minterRole, this.first.address))
        .to.emit(this.bigEyes, 'RoleGranted')
    })
    it('Non admin should not be entitled', async () => {
      const minterRole = await this.bigEyes.MINTER_ROLE.call()
      await expect(this.bigEyes.connect(this.first).grantRole(minterRole, this.first.address))
        .to.be.revertedWith(`AccessControl: account ${this.first.address.toLowerCase()} is missing role ${defaultAdminRole}`)
    })
  })
  describe('Ownership Transfer', async () => {
    let defaultAdminRole
    beforeEach(async () => {
      defaultAdminRole = await this.bigEyes.DEFAULT_ADMIN_ROLE.call()
    })
    it('Admin should be entitled', async () => {
      await expect(this.bigEyes.connect(this.deployer).transferOwnership(this.first.address))
        .to.emit(this.bigEyes, 'OwnershipTransferred')
        .withArgs(this.deployer.address, this.first.address)
    })
    it('Non admin should not be entitled', async () => {
      await expect(this.bigEyes.connect(this.second).transferOwnership(this.first.address))
        .to.be.revertedWith(`AccessControl: account ${this.second.address.toLowerCase()} is missing role ${defaultAdminRole}`)
    })
    describe('After onwership transfer', async () => {
      beforeEach(async () => {
        await this.bigEyes.connect(this.deployer).transferOwnership(this.first.address)
      })
      it('Previous owner should not be able to transfer ownership', async () => {
        await expect(this.bigEyes.connect(this.deployer).transferOwnership(this.second.address))
          .to.be.revertedWith(`AccessControl: account ${this.deployer.address.toLowerCase()} is missing role ${defaultAdminRole}`)
      })
    })
  })
  describe('Minting', async () => {
    let minterRole
    beforeEach('', async () => {
      minterRole = await this.bigEyes.MINTER_ROLE.call()
      this.amountToMint = 50
      await this.bigEyes.connect(this.deployer).grantRole(minterRole, this.first.address)
    })
    it('Minter should be able to mint', async () => {
      await expect(this.bigEyes.connect(this.first).mint(this.first.address, this.amountToMint))
        .to.emit(this.bigEyes, 'Transfer')
        .withArgs(ZERO_ADDRESS, this.first.address, this.amountToMint)
      expect(await this.bigEyes.totalSupply())
        .to.be.equal((await this.bigEyes.balanceOf(this.deployer.address)).add(await this.bigEyes.balanceOf(this.first.address)))
    })
    it('Non minter should not be able to mint', async () => {
      await expect(this.bigEyes.connect(this.second).mint(this.first.address, this.amountToMint))
        .to.be.revertedWith(`AccessControl: account ${this.second.address.toLowerCase()} is missing role ${minterRole}`)
    })
    it('Total Supply should be less than the limit', async () => {
      await expect(this.bigEyes.connect(this.first).mint(this.first.address, BigNumber.from('340282366920938463463374607431779999999')))
        .to.be.revertedWith('ERC20: Exceeds max limit')
    })
    it('No allowed to mint zero address', async () => {
      await expect(this.bigEyes.connect(this.first).mint('0x0000000000000000000000000000000000000000', this.amountToMint))
        .to.be.revertedWith('ERC20: mint to the zero address')
    })
  })
  describe('Burning', async () => {
    let amountToBurn
    beforeEach('', async () => {
      amountToBurn = this.initialBalance.div(2)
    })
    it('Should be able to burn BigEyes tokens', async () => {
      await this.bigEyes.connect(this.deployer).burn(amountToBurn)
      expect(await this.bigEyes.balanceOf(this.deployer.address))
        .to.be.equal(amountToBurn)
      expect(await this.bigEyes.totalSupply())
        .to.be.equal(await this.bigEyes.balanceOf(this.deployer.address))
    })

    it('Can not burn more than balance', async () => {
      await expect(this.bigEyes.connect(this.deployer).burn(this.initialBalance.add(1)))
        .to.be.revertedWith('ERC20: burn amount is exceeded')
    })
  })
  describe('Approve', async () => {
    let amountToApprove
    beforeEach('', async () => {
      amountToApprove = this.initialBalance.div(2)
      await this.bigEyes.connect(this.deployer).approve(this.first.address, amountToApprove)
    })
    it('Allowance should be the same with the approved amount', async () => {
      expect(await this.bigEyes.allowance(this.deployer.address, this.first.address))
        .to.be.equal(amountToApprove)
    })
    it('Spender can burnFrom approved amount', async () => {
      await expect(this.bigEyes.connect(this.first).burnFrom(this.deployer.address, amountToApprove))
        .to.emit(this.bigEyes, 'Transfer')
        .withArgs(this.deployer.address, ZERO_ADDRESS, amountToApprove)
      expect(await this.bigEyes.allowance(this.deployer.address, this.first.address))
        .to.be.equal(0)
      expect(await this.bigEyes.balanceOf(this.deployer.address))
        .to.be.equal(amountToApprove)
      expect(await this.bigEyes.totalSupply())
        .to.be.equal(amountToApprove)
    })
    it('Spender can transferFrom approved amount', async () => {
      await expect(this.bigEyes.connect(this.first).transferFrom(this.deployer.address, this.second.address, amountToApprove))
        .to.emit(this.bigEyes, 'Transfer')
        .withArgs(this.deployer.address, this.second.address, amountToApprove)
      expect(await this.bigEyes.allowance(this.deployer.address, this.first.address))
        .to.be.equal(0)
      expect(await this.bigEyes.balanceOf(this.deployer.address))
        .to.be.equal(amountToApprove)
      expect(await this.bigEyes.balanceOf(this.second.address))
        .to.be.equal(amountToApprove)
    })
    it('Spender can not burnFrom more than approved amount', async () => {
      await expect(this.bigEyes.connect(this.first).burnFrom(this.deployer.address, amountToApprove.add(1)))
        .to.be.revertedWith('ERC20: insufficient allowance')
    })
    it('Spender can not transferFrom more than approved amount', async () => {
      await expect(this.bigEyes.connect(this.first).transferFrom(this.deployer.address, this.second.address, amountToApprove.add(1)))
        .to.be.revertedWith('ERC20: transfer amount exceeds allowance')
    })
  })
  describe('NFT', async () => {
    let nftData
    beforeEach(async () => {
      nftData = [{
        name: 'Tico',
        appearance: 'Beautiful light Siamese',
        story: 'Was born a little bit extrabic. He was abandoned by his mum because he could not follow her and the other kittens from the same brood due to his slight vision impairment!'
      },
      {
        name: 'Garfield',
        appearance: 'Furry lovely mountain cat',
        story: 'Developed a strong bond with a rustic hut where friends once in a while meet together.'
      },
      {
        name: 'Pudim',
        appearance: 'Friendly striped caramel small cat.',
        story: 'Survived a fall from the fifth floor with minor nose bruises only.'
      }
      ]
      await this.bigEyes.connect(this.deployer).increaseAllowance(this.bigEyesNFTs.address, this.nftPrice)
    })
    it('Deployer should be able to mint the NFT', async () => {
      await expect(this.bigEyesNFTs.connect(this.deployer).mintNFT(this.first.address, 0, getRandomNumber(), [], nftData[0].name, nftData[0].appearance, nftData[0].story))
        .to.emit(this.bigEyesNFTs, 'NFTMinted')
    })
    describe('Second generation', async () => {
      let tokenIds
      beforeEach(async () => {
        await this.bigEyesNFTs.connect(this.deployer).mintNFT(this.first.address, 0, getRandomNumber(), [], nftData[0].name, nftData[0].appearance, nftData[0].story)
        await this.bigEyes.connect(this.deployer).increaseAllowance(this.bigEyesNFTs.address, this.nftPrice.mul(2))
        await this.bigEyesNFTs.connect(this.deployer).mintNFT(this.first.address, 0, getRandomNumber(), [], nftData[1].name, nftData[1].appearance, nftData[1].story)
        this.bigEyesNFT = await ethers.getContractAt('BigEyesNFT', await this.bigEyesNFTs.bigEyesNFT.call())
        const eventFilter = this.bigEyesNFT.filters.Transfer()
        const events = await this.bigEyesNFT.queryFilter(eventFilter)
        tokenIds = events.map(event => event.args.tokenId)
        await this.bigEyesNFT.connect(this.first).setApprovalForAll(this.bigEyesNFTs.address, true)
        await this.bigEyes.connect(this.first).increaseAllowance(this.bigEyesNFTs.address, this.nftPrice)
        await this.bigEyes.connect(this.deployer).transfer(this.first.address, this.nftPrice)
      })
      it('Deployer should be able to mint the NFT', async () => {
        await expect(this.bigEyesNFTs.connect(this.first).mintNFT(this.first.address, 1, getRandomNumber(), tokenIds, nftData[2].name, nftData[2].appearance, nftData[2].story))
          .to.emit(this.bigEyesNFTs, 'NFTMinted')
      })
    })
    describe('After minting', async () => {
      let balanceBefore
      beforeEach(async () => {
        balanceBefore = await this.bigEyes.balanceOf(this.deployer.address)
        await this.bigEyesNFTs.connect(this.deployer).mintNFT(this.first.address, 0, getRandomNumber(), [], nftData[0].name, nftData[0].appearance, nftData[0].story)
      })
      it('Should charge NFT price for the mint', async () => {
        const balanceAfter = await this.bigEyes.balanceOf(this.deployer.address)
        expect(balanceAfter).to.be.bignumber.equal(balanceBefore.sub(this.nftPrice))
      })
      it('Release should match shares ratio', async () => {
        const totalShares = this.shares.reduce((accumulator, curr) => accumulator + curr)
        for (let i = 0; i < this.payees.length; i++) {
          const currentPayeeAddress = this.payees[i].address
          const payeeBalanceBeforeRelease = await this.bigEyes.balanceOf(currentPayeeAddress)
          await this.bigEyesNFTs.release(currentPayeeAddress)
          const payeeBalanceAfterRelease = await this.bigEyes.balanceOf(currentPayeeAddress)
          const payeeBalanceIncrease = payeeBalanceAfterRelease.sub(payeeBalanceBeforeRelease)
          expect(payeeBalanceIncrease)
            .to.be.bignumber.equal(this.nftPrice.mul(this.shares[i]).div(totalShares))
        }
      })
    })
    describe('Set new NFT Price', async () => {
      let defaultAdminRole, newPrice
      beforeEach(async () => {
        newPrice = BigNumber.from('1500000000000000000')
        defaultAdminRole = await this.bigEyes.DEFAULT_ADMIN_ROLE.call()
      })
      it('Admin should be entitled', async () => {
        await expect(this.bigEyesNFTs.connect(this.deployer).setNFTPrice(newPrice))
          .to.emit(this.bigEyesNFTs, 'NFTPriceSet')
          .withArgs(newPrice)
      })
      it('Non admin should not be entitled', async () => {
        await expect(this.bigEyesNFTs.connect(this.second).setNFTPrice(newPrice))
          .to.be.revertedWith(`AccessControl: account ${this.second.address.toLowerCase()} is missing role ${defaultAdminRole}`)
      })
      describe('After setting new NFT price', async () => {
        let balanceBefore
        beforeEach(async () => {
          await this.bigEyesNFTs.connect(this.deployer).setNFTPrice(newPrice)
          balanceBefore = await this.bigEyes.balanceOf(this.deployer.address)
          await this.bigEyes.connect(this.deployer).increaseAllowance(this.bigEyesNFTs.address, newPrice.sub(this.nftPrice))
          await this.bigEyesNFTs.connect(this.deployer).mintNFT(this.first.address, 0, getRandomNumber(), [], nftData[0].name, nftData[0].appearance, nftData[0].story)
        })
        it('Should charge new NFT price for the mint', async () => {
          const balanceAfter = await this.bigEyes.balanceOf(this.deployer.address)
          expect(balanceAfter).to.be.bignumber.equal(balanceBefore.sub(newPrice))
        })
      })
    })
    describe('Set new URL Preamble', async () => {
      let defaultAdminRole, newPreamble
      beforeEach(async () => {
        newPreamble = 'https://anew.preamble'
        defaultAdminRole = await this.bigEyes.DEFAULT_ADMIN_ROLE.call()
      })
      it('Admin should be entitled', async () => {
        await expect(this.bigEyesNFTs.connect(this.deployer).setUrlPreamble(newPreamble))
          .to.emit(this.bigEyesNFTs, 'URLPreambleSet')
          .withArgs(newPreamble)
      })
      it('Non admin should not be entitled', async () => {
        await expect(this.bigEyesNFTs.connect(this.second).setUrlPreamble(newPreamble))
          .to.be.revertedWith(`AccessControl: account ${this.second.address.toLowerCase()} is missing role ${defaultAdminRole}`)
      })
      describe('After setting new URL Preamble', async () => {
        beforeEach(async () => {
          await this.bigEyesNFTs.connect(this.deployer).setUrlPreamble(newPreamble)
        })
        it('Should emit event with new url', async () => {
          await this.bigEyesNFTs.connect(this.deployer).mintNFT(this.first.address, 0, getRandomNumber(), [], nftData[0].name, nftData[0].appearance, nftData[0].story)
          let url = `${newPreamble}?hash=${nftData[2].hash}&name=${nftData[0].name}&appearance=${nftData[0].appearance}&story=${nftData[0].story}`
          url = url.replace(/ /g, '%20').replace(/[.]/g, '%2e')
          const eventFilter = this.bigEyesNFTs.filters.NFTMinted()
          const events = await this.bigEyesNFTs.queryFilter(eventFilter)
          const hashRegex = /(?<=hash=).*(?=&)/
          expect(events[0].args[0]).to.be.equal(this.deployer.address)
          expect(events[0].args[1]).to.be.equal(this.first.address)
          expect(events[0].args[2].replace(hashRegex, '')).to.be.equal(url.replace(hashRegex, ''))
        })
      })
    })
  })
})
