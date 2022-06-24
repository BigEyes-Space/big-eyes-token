import { getNamedSigners } from '../src/signers'

const func = async (hre) => {
  const { deployments } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedSigners()
  await deploy('StringsLib', { from: deployer.address })
}
export default func
func.tags = ['StringsLib']
