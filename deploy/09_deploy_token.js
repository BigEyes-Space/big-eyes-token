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
    router = await ethers.getContractAt('UniswapV2Router02', '0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3') // https://pancake.kiemtienonline360.com/
  } else if (hre.network.name === 'rinkeby') {
    router = await ethers.getContractAt('UniswapV2Router02', '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D')
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
