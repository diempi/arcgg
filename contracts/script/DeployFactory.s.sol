// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ArcGGFactory} from "../src/ArcGGFactory.sol";

/// @notice Deploys the ArcGG factory (once per chain).
///   source .env && forge script script/DeployFactory.s.sol --rpc-url arc_testnet --broadcast
contract DeployFactory is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        ArcGGFactory factory = new ArcGGFactory();
        vm.stopBroadcast();

        console.log("ArcGGFactory deployed at:", address(factory));
        console.log("Explorer: https://testnet.arcscan.app/address/%s", address(factory));
    }
}
