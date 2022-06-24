import { getNamedSigners } from '../src/signers'

const func = async (hre) => {
  if (hre.network.name === 'hardhat' || hre.network.name === 'ganache') {
    const { deployments } = hre
    const { deploy } = deployments
    const namedSigners = await getNamedSigners()
    const { deployer } = namedSigners
    await deploy('WETH', {
      from: deployer.address,
      log: true
    })
  }
}
export default func
func.tags = ['WETH']
