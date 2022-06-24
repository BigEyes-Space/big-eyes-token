import { getNamedSigners } from '../src/signers'

const func = async (hre) => {
  const { deployments } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedSigners()
  await deploy('UniswapV2Factory', {
    from: deployer.address,
    args: [deployer.address],
    log: true
  })
}
export default func
func.tags = ['UniswapV2Factory']
