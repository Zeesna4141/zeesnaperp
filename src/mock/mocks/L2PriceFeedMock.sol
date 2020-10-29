// SPDX-License-Identifier: BSD-3-CLAUSE
pragma solidity 0.6.9;


contract L2PriceFeedMock {
    uint256 price;

    constructor(uint256 _price, address _bridge, address _keeper) public {
        price = _price;
    }

    function getPrice(bytes32) public view returns (uint256) {
        return price;
    }

    function setPrice(uint256 _price) public {
        price = _price;
    }

    event PriceFeedDataSet(bytes32 key, uint256 price, uint256 timestamp, uint256 roundId);

    function setLatestData(bytes32 _priceFeedKey, uint256 _price, uint256 _timestamp, uint256 _roundId) external {
        emit PriceFeedDataSet(_priceFeedKey, _price, _timestamp, _roundId);
    }
}