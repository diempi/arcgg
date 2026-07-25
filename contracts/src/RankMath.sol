// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
/// @title RankMath — pure prize-split math with explicit integer-division dust handling
/// @notice Everything is native-USDC 18-decimal wei. No detour through the 6-decimal
///         ERC-20 interface at 0x3600...0000 — mixing them is a silent 10^12 bug.
library RankMath {
    /// @param pool total prize pool, in 18-decimal native-USDC wei
    /// @param bps  distribution table in basis points; index 0 = 1st place. MUST sum to 10_000.
    /// @return parts per-rank payouts whose sum equals `pool` EXACTLY.
    /// @dev Integer division truncates, so sum(truncated parts) <= pool. The leftover
    ///      dust (strictly < bps.length wei) is folded into rank 0 (the winner).
    ///      If bps sums to > 10_000, `pool - distributed` underflows and REVERTS — fail-safe.
    ///      If bps sums to < 10_000 (misconfig), rank 0 silently absorbs the shortfall,
    ///      which is why the vault MUST enforce sum(bps) == 10_000 at construction.
    function computeParts(uint256 pool, uint16[] memory bps)
        internal
        pure
        returns (uint256[] memory parts)
    {
        uint256 n = bps.length;
        parts = new uint256[](n);

        uint256 distributed;
        for (uint256 i = 0; i < n; i++) {
            uint256 p = (pool * bps[i]) / 10_000;
            parts[i] = p;
            distributed += p;
        }

        // Assign the rounding remainder to 1st place. Reverts on over-100% tables.
        parts[0] += pool - distributed;
    }
}
