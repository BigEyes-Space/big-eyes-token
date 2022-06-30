const verify = async (address, constructorArguments, libraries) => {
  try {
    await hre.run('verify:verify', {
      address,
      constructorArguments,
      libraries
    })
  } catch (e) {
    if (e.message === 'Contract source code already verified') { console.log('Already verified!') } else { throw new Error(e.message) }
  }
}

export default verify
