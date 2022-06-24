import { getNamedSigners } from '../src/signers'

const func = async (hre) => {
  const { deployments } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedSigners()
  await deploy('SafeMath', { from: deployer.address, contract: '@openzeppelin/contracts/utils/math/SafeMath.sol:SafeMath' })
}
export default func
func.tags = ['SafeMath']
