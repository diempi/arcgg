// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PrizePoolVault} from "../src/PrizePoolVault.sol";

/// @notice Deploys a demo ArcGG vault to Arc testnet.
/// Usage:
///   cp .env.example .env   # fill PRIVATE_KEY (testnet only!)
///   source .env
///   forge script script/Deploy.s.sol --rpc-url arc_testnet --broadcast
///
/// For the hackathon demo the deployer is both admin and one of three arbiters;
/// replace the arbiter addresses with real distinct wallets for a live tournament.
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        // Demo arbiter set: 2-of-3. Override via env or edit for real use.
        address[] memory arbiters = new address[](3);
        arbiters[0] = deployer;
        arbiters[1] = vm.envOr("ARBITER_2", address(0x2222222222222222222222222222222222222222));
        arbiters[2] = vm.envOr("ARBITER_3", address(0x3333333333333333333333333333333333333333));

        // 60 / 30 / 10 podium split
        uint16[] memory bps = new uint16[](3);
        bps[0] = 6000;
        bps[1] = 3000;
        bps[2] = 1000;

        vm.startBroadcast(pk);
        PrizePoolVault vault = new PrizePoolVault({
            _admin: deployer,
            arbiters: arbiters,
            _threshold: 2,
            _tournamentId: keccak256("ARCGG_DEMO_TOURNAMENT_1"),
            _prizePool: 10 ether, // 10 native USDC (18 dec on Arc)
            rankBps_: bps,
            _fundingDeadline: block.timestamp + 2 days,
            _resolutionDeadline: block.timestamp + 5 days,
            _challengeWindow: 1 hours, // short for demo; 48h+ in production
            _challengeBond: 0.5 ether
        });
        vm.stopBroadcast();

        console.log("ArcGG PrizePoolVault deployed at:", address(vault));
        console.log("Explorer: https://testnet.arcscan.app/address/%s", address(vault));
    }
}
