import { BigNumber } from 'ethers'

const getDeploymentArguments = async (artifacts) => {
  const feeMultiplier = 10
  const name = 'Big Eyes'
  const symbol = 'BGE'
  const initialAccount = artifacts.deployer.address
  const initialBalance = BigNumber.from('1000000000000000000')
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
    onBuyFees: [0.1 * feeMultiplier, 0.2 * feeMultiplier, 0.3 * feeMultiplier], // liquidity, marketing, distribution
    onSellFees: [0.4 * feeMultiplier, 0.5 * feeMultiplier, 0.6 * feeMultiplier], // liquidity, marketing, distribution
    feeMultiplier
  }
}

export { getDeploymentArguments }
