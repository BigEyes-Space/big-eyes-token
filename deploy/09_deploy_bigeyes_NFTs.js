import { getNamedSigners } from '../src/signers'
import { getContract } from '../src/getContract'
import { getDeploymentArgumentsForNFTs } from '../src/getDeploymentArgumentsForNFTs'
import verify from '../src/hreVerify'

const func = async (hre) => {
  const { deployments } = hre
  const { deploy } = deployments
  const namedSigners = await getNamedSigners()
  const { deployer } = namedSigners
  // const stringsLib = await getContract('StringsLib')
  const bytes32UtilsLibrary = await getContract('Bytes32Utils')
  const bigEyes = await getContract('BigEyes')
  const deploymentArgs = await getDeploymentArgumentsForNFTs({ ...namedSigners, bigEyes })
  deploymentArgs.payees = deploymentArgs.payees.map(payee => { return payee.address })
  const args = Object.values(deploymentArgs)
  const libraries = {
    Bytes32Utils: bytes32UtilsLibrary.address
    // StringsLib: stringsLib.address
  }
  const bigEyesNfts = await deploy('BigEyesNFTs', {
    from: deployer.address,
    args,
    libraries,
    log: true
  })

  if (hre.network.name !== 'hardhat' && hre.network.name !== 'ganache') {
    await verify(bigEyesNfts.address, args, libraries)
  }
}
export default func
func.tags = ['BigEyesNFTs']
module.exports.dependencies = ['Bytes32Utils', 'BigEyes', 'StringsLib']
