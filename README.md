# ArcGG — GG, get paid.

Auto-arbitrated esports prize pools on [Arc](https://arc.io), Circle's stablecoin-native L1.
Sponsors lock USDC upfront, results settle instantly into locked claims, winners withdraw
after a clean challenge window.

**Track:** DeFi · Build on Arc Hackathon (Encode, 2026)

## The problem

In grassroots esports — especially across Africa's fast-growing competitive scene — prize
money runs on trust. Organizers collect entry fees and sponsor money off-chain, and winners
chase payouts for weeks. Sometimes the money never comes. The pattern is so common it has
a name in every community: *the organizer ran off with the pot.*

## The solution

ArcGG replaces "trust the organizer" with a state-machine vault on Arc:

1. **The pot is locked before play begins.** Deposits are visible on-chain; the tournament
   can't go live until the pool is fully funded. Nobody can spend it — not even the admin.
2. **Results are attested, not declared.** An M-of-N arbiter set signs the final ranking
   (EIP-712). No single trusted party can forge a result.
3. **Settlement is instant, withdrawal is safe.** Claims are allocated the second a result
   lands — but locked behind a challenge window. Disqualifications and cheating disputes
   resolve *before* any money leaves the contract. "Paid then disqualified" is structurally
   impossible.
4. **Funds can never be frozen forever.** Every live state has a deadline valve anyone can
   trigger, refunding depositors if the organizer or arbiters vanish.

## State machine

```
Created ──► Funded ──► Live ──► ResultProposed ──► Withdrawable ──► Closed
                                   ▲       │
                                   │       ▼
                                └─ Challenged        (bounded re-resolution loop)

{Created, Funded, Live, Challenged} ──deadline──► Cancelled ──► refunds (pull)
```

Key mechanics:

- **Locked claims + challenge window** — instant settlement without irreversible mistakes.
- **M-of-N EIP-712 attestation** — signatures bind to `(chainId, vault, tournamentId,
  rankingHash, round)`; a round-0 signature can never validate a re-resolution.
- **Challenge bond** — disputes cost a stake. Founded challenge (ranking changed): bond
  refunded. Unfounded: the bond compensates the delayed winner. Griefing a winner pays
  the winner.
- **Pull payments only** — winners withdraw; the contract never pushes funds. Money can
  only ever reach registered participant wallets, depositors (refunds), or the challenger
  (bond) — there is no code path to an arbitrary address, not even for the admin.
- **Exact accounting** — `RankMath` splits the pool by rank with integer-division dust
  explicitly folded into 1st place; `sum(claims) == prizePool` is asserted on-chain and
  fuzz-proven off-chain.

## Why Arc, specifically

- **Native USDC gas & settlement** — the prize asset *is* the gas asset; sub-second finality
  makes "match ends → pot moves" feel instant on stream.
- **Native-first design** — all value moves via `msg.value` on Arc's 18-decimal native USDC.
  The 6-decimal ERC-20 interface at `0x3600...0000` is deliberately never touched: mixing
  the two decimal conventions is a silent 10^12 discrepancy, and this codebase treats that
  as a first-class design constraint rather than a footnote.

## Repository layout

```
contracts/   Foundry project (Solidity 0.8.24, OpenZeppelin v5.6)
  src/       PrizePoolVault.sol · ArbiterAttestation.sol · RankMath.sol
  test/      21 tests: state machine, bond mechanics, replay protection, fuzz invariants
  script/    Deploy.s.sol (Arc testnet)
app/         Next.js + Viem + Wagmi frontend        (in progress)
agent/       Result-relay service (Node + Viem)      (in progress)
```

## Run it

```bash
cd contracts
forge install          # forge-std + openzeppelin-contracts v5.6
forge build
forge test             # 21 tests incl. 512-run fuzz on the payout invariant
```

Deploy to Arc testnet ([faucet](https://faucet.circle.com), chain id `5042002`):

```bash
cp .env.example .env   # add a TESTNET-ONLY private key
source .env
forge script script/Deploy.s.sol --rpc-url arc_testnet --broadcast
```

## Status

- [x] Vault state machine — complete, 21/21 tests green
- [x] M-of-N arbiter attestation with cross-round replay protection
- [x] Challenge bond mechanics + refund deadlines on every live state
- [ ] Arc testnet deployment
- [ ] Minimal frontend (deposit / propose / withdraw)
- [ ] Result-relay agent (Agentic track, stretch)
- [ ] 3-min pitch video + deck

## License

MIT
