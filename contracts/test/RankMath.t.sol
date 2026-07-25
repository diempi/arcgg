// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {RankMath} from "../src/RankMath.sol";

/// Thin harness so the fuzzer can call the internal pure library function.
contract RankMathHarness {
    function computeParts(uint256 pool, uint16[] memory bps)
        external
        pure
        returns (uint256[] memory)
    {
        return RankMath.computeParts(pool, bps);
    }
}

contract RankMathTest is Test {
    RankMathHarness harness;

    function setUp() public {
        harness = new RankMathHarness();
    }

    /// The core invariant, fuzzed: parts always sum to the pool, exactly.
    function testFuzz_partsSumToPool(uint256 pool, uint16 a, uint16 b) public view {
        pool = bound(pool, 0, 1e30); // up to 1e12 USDC — far past realistic
        a = uint16(bound(a, 0, 10_000));
        b = uint16(bound(b, 0, 10_000 - a));
        uint16 c = uint16(10_000 - a - b); // remainder guarantees exact 100%

        uint16[] memory bps = new uint16[](3);
        bps[0] = a;
        bps[1] = b;
        bps[2] = c;

        uint256[] memory parts = harness.computeParts(pool, bps);

        uint256 s;
        for (uint256 i = 0; i < parts.length; i++) {
            s += parts[i];
        }
        assertEq(s, pool, "parts must sum to pool");
    }

    /// Dust lands on rank 0. 100 wei split 3333/3333/3334 bps.
    function test_dustGoesToFirstPlace() public view {
        uint16[] memory bps = new uint16[](3);
        bps[0] = 3333;
        bps[1] = 3333;
        bps[2] = 3334;

        uint256[] memory parts = harness.computeParts(100, bps);
        // raw truncation: 33 / 33 / 33 = 99 -> 1 wei dust -> rank 0 gets 34
        assertEq(parts[0], 34);
        assertEq(parts[1], 33);
        assertEq(parts[2], 33);
        assertEq(parts[0] + parts[1] + parts[2], 100);
    }

    /// Realistic 60/30/10 split of an odd pool still balances to the wei.
    function test_oddPoolBalances() public view {
        uint16[] memory bps = new uint16[](3);
        bps[0] = 6000;
        bps[1] = 3000;
        bps[2] = 1000;

        uint256 pool = 1_000_000_000_000_000_001; // 1 USDC + 1 wei
        uint256[] memory parts = harness.computeParts(pool, bps);
        assertEq(parts[0] + parts[1] + parts[2], pool);
    }

    /// Fail-safe: a table exceeding 100% must revert, never over-allocate.
    function test_revertsWhenBpsOverHundredPercent() public {
        uint16[] memory bps = new uint16[](2);
        bps[0] = 7000;
        bps[1] = 4000; // 110%

        vm.expectRevert(); // pool - distributed underflows -> checked-math revert
        harness.computeParts(1 ether, bps);
    }
}
