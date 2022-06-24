// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";
import "./TokenRecover.sol";
import "./BigEyesNFT.sol";
import "./PaymentSplitter.sol";
import "./Bytes32Utils.sol";
import "./NativeTokenReceiver.sol";
import "./StringsLib/StringsLib.sol";

contract BigEyesNFTs is TokenRecover, NativeTokenReceiver, PaymentSplitter {
    event NFTMinted(address from, address to, string url);
    event NFTBurned(address from, uint256 tokenId);
    event NFTPriceSet(uint newPrice);
    event URLPreambleSet(string newPreamble);

    using Bytes32Utils for bytes32;
    using StringsLib for string;
    using Strings for uint;

    StringsLib.Data private data;
    
    BigEyesNFT public bigEyesNFT;
    uint public nftPrice;
    string private _urlPreamble;
    mapping(uint => uint) public editionCap;

    constructor (
        address[] memory payees_,
        uint256[] memory shares_,
        uint nftPrice_,
        string memory urlPreamble_,
        IERC20 bigEyesTokenAddress
    ) payable PaymentSplitter(bigEyesTokenAddress, payees_, shares_) {
    // ) payable ERC20(name, symbol) PaymentSplitter(this, payees_, shares_) {
        _urlPreamble = urlPreamble_;
        nftPrice = nftPrice_;
        bigEyesNFT = new BigEyesNFT("BigEyesNFT", "BEN");
    }

    function burnNFT(uint256 tokenId) external{
        require(_msgSender() == bigEyesNFT.ownerOf(tokenId), "You are not the owner!");
        _burnNFT(tokenId);
    }

    function _burnNFT(uint256 tokenId) internal {
        address owner = bigEyesNFT.ownerOf(tokenId);
        bigEyesNFT.burn(tokenId);
        emit NFTBurned(owner, tokenId);
    }    

    function mintNFT(address to, uint edition, uint randomUint, uint256[] memory parents, string memory name, string memory appearance, string memory story) external {
        _mintNFT(to, edition, randomUint, parents, name, appearance, story);
    }

    function mintMyNFT(uint edition, uint randomUint, uint256[] memory parents, string memory name, string memory appearance, string memory story) external {
        _mintNFT(_msgSender(), edition, randomUint, parents, name, appearance, story);
    }

    function _mintNFT(address to, uint edition, uint randomUint, uint256[] memory parents, string memory name, string memory appearance, string memory story) internal {
        if (edition == 0){
            require(parents.length == 0, "Can not have parents!");
        } else {
            require(parents.length == 2, "Must have two parents!");
        }
        require(editionCap[edition] < 10000*2**edition, "This edition was sold out!");

        editionCap[edition] = editionCap[edition] + 1;
        address from = _msgSender();
        super.deposit(from, nftPrice);
        // https://ethereum.stackexchange.com/a/56337
        bytes32 theHash = keccak256(abi.encodePacked(
            // solhint-disable-next-line not-rely-on-time
            block.timestamp,
            msg.sender,
            randomUint
        ));

        for (uint i = 0; i < parents.length; i++){
            _burnNFT(parents[i]);
        }        

        string memory url = string(abi.encodePacked(
                _urlPreamble,
                "?hash=", theHash.toString(),
                "&name=", name,
                "&appearance=", appearance,
                "&story=", story
            ))
            .replace(" ", "%20", 0)
            .replace(".", "%2e", 0);
        console.log("\nMinting NFT with URL: %s.", url);
        bigEyesNFT.safeMint(to, url);
        emit NFTMinted(from, to, url);
    }

    function setNFTPrice(uint nftPrice_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        nftPrice = nftPrice_;
        emit NFTPriceSet(nftPrice_);
    }

    function setUrlPreamble(string memory urlPreamble_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _urlPreamble = urlPreamble_;
        emit URLPreambleSet(urlPreamble_);
    }
}
