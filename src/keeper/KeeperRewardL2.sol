// SPDX-License-Identifier: BSD-3-CLAUSE
pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;

import { KeeperRewardBase } from "./KeeperRewardBase.sol";
import { IAmm } from "../interface/IAmm.sol";
import { IClearingHouse } from "../interface/IClearingHouse.sol";
import { PerpToken } from "../PerpToken.sol";

contract KeeperRewardL2 is KeeperRewardBase {
    function initialize(PerpToken _perpToken) external {
        __BaseKeeperReward_init(_perpToken);
    }

    /**
     * @notice call this function to pay funding payment and get token reward
     */
    function payFunding(IAmm _amm) external {
        bytes4 selector = IClearingHouse.payFunding.selector;
        TaskInfo memory task = getTaskInfo(selector);

        IClearingHouse(task.contractAddr).payFunding(_amm);
        postTaskAction(selector);
    }
}
