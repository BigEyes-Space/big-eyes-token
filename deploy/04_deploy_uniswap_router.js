import { getNamedSigners } from '../src/signers'
import { ethers } from 'hardhat'

const func = async (hre) => {
  if (hre.network.name === 'hardhat' || hre.network.name === 'ganache') {
    const { deployments } = hre
    const { deploy } = deployments
    const { deployer } = await getNamedSigners()

    const uniswapV2Factory = await ethers.getContract('UniswapV2Factory')
    const wETH = await ethers.getContract('WETH')

    await deploy('UniswapV2Router02', {
      from: deployer.address,
      args: [uniswapV2Factory.address, wETH.address],
      log: true
    })
  }
}
export default func
func.tags = ['UniswapV2Router02']
module.exports.dependencies = ['UniswapV2Factory', 'WETH']
