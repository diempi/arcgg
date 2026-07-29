# ArcGG — Demo runbook (Arc Testnet)

The full lifecycle of a tournament, command by command, mapped to video scenes.
Terminal on one side, the frontend (localhost:3000) on the other — every command
makes the UI move.

> Rehearsed end-to-end on a local chain: register → fund → live → 2-of-3
> attestation → propose → window → finalize → withdraw, exact-to-the-wei.

## 0. Session setup

The demo vault is already deployed with real arbiters and a 120s window:

```
0xbCAce0C49cf272786005217BbE457196F73AB628
```

`contracts/.env` already holds: `PRIVATE_KEY` (deployer = admin + arbiter #1),
`ARBITER_2`, `ARBITER_3`, `ARBITER_2_PK`, `WINNER`, `WINNER_PK`,
`PRIZE_POOL`, `CHALLENGE_WINDOW=120`, `CHALLENGE_BOND`.

```bash
cd contracts && source .env
export VAULT=0xbCAce0C49cf272786005217BbE457196F73AB628
export RPC=https://rpc.testnet.arc.network
```

Need two more registered player wallets (any distinct addresses you control;
only rank-0 withdraws on camera):

```bash
cast wallet new   # → BOB   (address is enough)
cast wallet new   # → CAROL (address is enough)
export BOB=0x... CAROL=0x...
```

To re-run the demo from scratch later: redeploy (`source .env && forge script
script/Deploy.s.sol --rpc-url arc_testnet --broadcast`), update VAULT here and
`VAULT_ADDRESS` in `app/lib/chain.ts`.

## Scene 1 — "The pot is code" (state: Created)

UI shows the empty vault, rail on **Created**. Register the roster
(space out commands ~1s; Arc's public RPC rate-limits bursts):

```bash
cast send $VAULT "registerParticipant(bytes32,address)" $(cast format-bytes32-string "alice") $WINNER --private-key $PRIVATE_KEY --rpc-url $RPC
cast send $VAULT "registerParticipant(bytes32,address)" $(cast format-bytes32-string "bob")   $BOB    --private-key $PRIVATE_KEY --rpc-url $RPC
cast send $VAULT "registerParticipant(bytes32,address)" $(cast format-bytes32-string "carol") $CAROL  --private-key $PRIVATE_KEY --rpc-url $RPC
```

## Scene 2 — Sponsors lock the pot (Created → Funded)

**In the UI**: connect MetaMask (deployer key), deposit e.g. 4 USDC from the
Sponsor panel — progress bar, then "✓ Deposited 4 USDC" on screen.
**In the terminal**, top it up to exactly the pool:

```bash
cast send $VAULT "deposit()" --value 6ether --private-key $PRIVATE_KEY --rpc-url $RPC
```

Rail flips to **Funded** on its own (UI polls every 15 s).

## Scene 3 — Tournament runs (Funded → Live)

```bash
cast send $VAULT "goLive()" --private-key $PRIVATE_KEY --rpc-url $RPC
```

Rail: **Live**. Narrate: "the pot is locked — nobody can touch it, not even me."

## Scene 4 — Match ends. GG. (Live → ResultProposed)

Arbiters sign the ranking off-chain (2-of-3: deployer + arbiter 2):

```bash
cd ../demo && npm install   # first time only
RPC=$RPC VAULT=$VAULT \
RANKED=$WINNER,$BOB,$CAROL \
ROUND=0 \
ARBITER_PKS=$PRIVATE_KEY,$ARBITER_2_PK \
node sign-result.mjs
```

Copy `RANKED_ARG` and `SIGS_ARG` from the output into:

```bash
cast send $VAULT "proposeResult(address[],bytes[])" 'RANKED_ARG' 'SIGS_ARG' --private-key $PRIVATE_KEY --rpc-url $RPC
```

UI: rail jumps to **ResultProposed**, the winner's claim shows 6.00 USDC
(60% of the pot, dust folded in), and the **120-second challenge-window
countdown ticks on screen**. This is the money shot: settled instantly,
locked safely.

## Scene 5 — Window closes clean (ResultProposed → Withdrawable)

The countdown hits zero; the UI swaps to a **Finalize** button. Click it
(anyone can), or:

```bash
cast send $VAULT "finalize()" --private-key $PRIVATE_KEY --rpc-url $RPC
```

## Scene 6 — GG, get paid (Withdrawable → …)

Switch MetaMask to the **winner** wallet (import WINNER_PK, testnet-only).
The Claim panel shows 6.00 USDC; click **Withdraw prize** — progress bar,
then "✓ GG — 6.00 USDC paid out to your wallet." Show the wallet balance
and the arcscan transaction.

Optional stinger for the video: run the whole flow again on a fresh vault and
file a `challenge()` in the window to show the dispute path (bond, Challenged
badge, re-resolution).

## Cheat sheet — state reads

```bash
cast call $VAULT "snapshot()(uint8,uint256,uint256,uint256,uint256,uint256,uint256)" --rpc-url $RPC
cast call $VAULT "snapshotFor(address)(uint256,uint256,uint256)" $WINNER --rpc-url $RPC
```
