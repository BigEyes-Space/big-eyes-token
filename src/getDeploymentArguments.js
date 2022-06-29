import { BigNumber } from 'ethers'

const getDeploymentArguments = async (artifacts) => {
  const name = 'Big Eyes'
  const symbol = 'BGE'
  const initialAccount = artifacts.deployer.address
  const initialBalance = BigNumber.from('200000000000000000000000000000')
  // 90%
  const slippageFactorNumerator = await artifacts.aBDKMathQuadLibrary.fromInt(90)
  const slippageFactorDenominator = await artifacts.aBDKMathQuadLibrary.fromInt(100)
  const slippageFactor = await artifacts.aBDKMathQuadLibrary.div(slippageFactorNumerator, slippageFactorDenominator) // slippageFactor

  const routerAddress = artifacts.router.address
  // const urlPreamble = 'http://localhost:3000/'
  return {
    name,
    symbol,
    initialAccount,
    initialBalance,
    slippageFactor,
    routerAddress,
    onBuyFees: [1, 2, 3], // liquidity, marketing, distribution
    onSellFees: [4, 5, 6] // liquidity, marketing, distribution
  }
}

export { getDeploymentArguments }
