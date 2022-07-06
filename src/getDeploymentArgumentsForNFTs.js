import { BigNumber } from 'ethers'

const getDeploymentArgumentsForNFTs = async (artifacts) => {
  const payees = [artifacts.deployer, artifacts.first, artifacts.second]
  const shares = [90, 7, 3]
  const nftPrice = BigNumber.from('1000000000000000000')
  const urlPreamble = 'https://characters.bigeyes.space/api/metadata'
  const bigEyesAddress = artifacts.bigEyes.address
  // const urlPreamble = 'http://localhost:3000/'
  return {
    payees,
    shares,
    nftPrice,
    urlPreamble,
    bigEyesAddress
  }
}

export { getDeploymentArgumentsForNFTs }
