import { getNamedSigners } from '../src/signers'
import { getContract } from '../src/getContract'

const func = async (hre) => {
  const { deployments } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedSigners()

  const uniswapV2Factory = await getContract('UniswapV2Factory')
  const wETH = await getContract('WETH')
  const uniswapV2Library = await getContract('UniswapV2Library')

  await deploy('UniswapV2Router02', {
    from: deployer.address,
    args: [uniswapV2Factory.address, wETH.address],
    libraries: {
      UniswapV2Library: uniswapV2Library.address
    },
    log: true
  })
}
export default func
func.tags = ['UniswapV2Router02']
module.exports.dependencies = ['UniswapV2Factory', 'WETH', 'UniswapV2Library']
