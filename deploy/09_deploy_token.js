import { getNamedSigners } from '../src/signers'
import { getDeploymentArguments } from '../src/getDeploymentArguments'
import { getContract } from '../src/getContract'
import { ethers } from 'hardhat'

const func = async (hre) => {
  const { deployments } = hre
  const { deploy } = deployments
  const namedSigners = await getNamedSigners()
  const { deployer } = namedSigners
  const aBDKMathQuadLibrary = await getContract('ABDKMathQuad')
  const roundDiv = await deployments.get('RoundDiv')
  const safeMath = await deployments.get('SafeMath')
  let router
  if (hre.network.name === 'bscTestnet') {
    router = await ethers.getContractAt('UniswapV2Router02', '0x5ac1885197ab45dd0e0d756bf90749bf94c2a05d')
  } else {
    router = await deployments.get('UniswapV2Router02')
  }
  const deploymentArgs = await getDeploymentArguments({ ...namedSigners, router, aBDKMathQuadLibrary })
  const args = Object.values(deploymentArgs)
  await deploy('BigEyes', {
    from: deployer.address,
    args,
    libraries: {
      ABDKMathQuad: aBDKMathQuadLibrary.address,
      RoundDiv: roundDiv.address,
      SafeMath: safeMath.address
    },
    log: true
  })
}
export default func
func.tags = ['BigEyes']
module.exports.dependencies = ['UniswapV2Router02', 'ABDKMathQuad', 'RoundDiv', 'SafeMath']
