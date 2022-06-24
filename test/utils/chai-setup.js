import chaiModule from 'chai'
import { chaiEthers } from 'chai-ethers'
// eslint-disable-next-line no-unused-vars
import { BN } from '@openzeppelin/test-helpers'
import { solidity } from 'ethereum-waffle'

chaiModule.use(chaiEthers)
chaiModule.use(solidity)
const expect = chaiModule.expect

export { expect }
