const ethers = require('ethers')
const url = 'http://localhost:8545'

const init = function () {
  const customWsProvider = new ethers.providers.WebSocketProvider(url)

  customWsProvider.on('pending', (tx) => {
    customWsProvider.getTransaction(tx).then(function (transaction) {
      console.log(transaction)
      // //   console.log(transaction.data);
      //   const data = '0x7ff36ab50000000000000000000000000000000000000000000000bc18ba4144048bbab00000000000000000000000000000000000000000000000000000000000000080000000000000000000000000c0c5eb43e2df059e3be6e4fb0284c283caa5991900000000000000000000000000000000000000000000000000000000614d87a80000000000000000000000000000000000000000000000000000000000000002000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c00000000000000000000000008ba0619b1e7a582e0bce5bbe9843322c954c340';

      // //   const decoded = ethers.utils.defaultAbiCoder.decode(
      // //     ['uint256', 'address[]', 'address', 'uint256'],
      // //     ethers.utils.hexDataSlice(data, 4)
      // //   )

      //   const iface = new ethers.utils.Interface(['function swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline)'])
      //   const decoded = iface.decodeFunctionData('swapExactETHForTokens', data)
      // //   const decoded = iface.decodeFunctionData('swapExactETHForTokens', transaction.data)

      //   console.log(decoded)

      // Instrumenting EVM
      // https://ethereum.stackexchange.com/a/9497
      const provider = new ethers.providers.JsonRpcProvider()
      provider.send('debug_traceTransaction', [transaction.hash, {}]).then(result => {
        console.log(result)
      })
    })
  })

  customWsProvider._websocket.on('error', async (ep) => {
    console.log(`Unable to connect to ${ep.subdomain} retrying in 3s...`)
    setTimeout(init, 3000)
  })
  customWsProvider._websocket.on('close', async (code) => {
    console.log(
      `Connection lost with code ${code}! Attempting reconnect in 3s...`
    )
    customWsProvider._websocket.terminate()
    setTimeout(init, 3000)
  })
}

init()
