import replace from 'replace-in-file';

const options = {

  //Single file
  files: 'node_modules/@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol',

  // //Multiple files
  // files: [
  //   'path/to/file',
  //   'path/to/other/file',
  // ],

  // //Glob(s) 
  // files: [
  //   'path/to/files/*.html',
  //   'another/**/*.path',
  // ],

  //Replacement to make (string or regex) 
  from: '96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
  to: 'b594b680ac8ffbcd817033d8b9a0f18807d93811006cb8a3ad1884015bb00ea0',
};

replace(options)
  .then(changedFiles => {
    console.log('Modified files:', changedFiles.join(', '));
  })
  .catch(error => {
    console.error('Error occurred:', error);
  });