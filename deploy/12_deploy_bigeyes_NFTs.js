import { getNamedSigners } from '../src/signers'
import { getContract } from '../src/getContract'
import { getDeploymentArgumentsForNFTs } from '../src/getDeploymentArgumentsForNFTs'

const func = async (hre) => {
  const { deployments } = hre
  const { deploy } = deployments
  const namedSigners = await getNamedSigners()
  const { deployer } = namedSigners
  const strings = await getContract('Strings')
  const stringsLib = await getContract('StringsLib')
  const bytes32UtilsLibrary = await getContract('Bytes32Utils')
  const bigEyes = await getContract('BigEyes')
  const deploymentArgs = await getDeploymentArgumentsForNFTs({ ...namedSigners, bigEyes })
  deploymentArgs.payees = deploymentArgs.payees.map(payee => { return payee.address })
  const args = Object.values(deploymentArgs)
  await deploy('BigEyesNFTs', {
    from: deployer.address,
    args,
    libraries: {
      Bytes32Utils: bytes32UtilsLibrary.address,
      Strings: strings.address,
      StringsLib: stringsLib.address
    },
    log: true
  })
}
export default func
func.tags = ['BigEyesNFTs']
module.exports.dependencies = ['Bytes32Utils', 'UniswapV2Router02', 'BigEyes', 'Strings', 'StringsLib']
