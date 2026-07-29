"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther } from "viem";
import { arcTestnet, VAULT_ADDRESS } from "@/lib/chain";
import { vaultAbi, STATES, RAIL, type VaultState } from "@/lib/vault";
import { fmtUsdc, shortAddr } from "@/lib/format";

const vault = { address: VAULT_ADDRESS, abi: vaultAbi } as const;
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** Indeterminate progress bar shown while a transaction is confirming. */
function TxProgress({ label }: { label: string }) {
  return (
    <div className="mt-3">
      <div className="h-1.5 overflow-hidden rounded-full bg-ink">
        <div className="h-full w-1/3 animate-tx-slide rounded-full bg-gradient-to-r from-violet to-cyan" />
      </div>
      <p className="mt-1.5 text-xs text-mut">{label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function Home() {
  const mounted = useMounted();
  const { address, isConnected } = useAccount();

  const { data, refetch } = useReadContracts({
    contracts: [
      { ...vault, functionName: "state" },
      { ...vault, functionName: "prizePool" },
      { ...vault, functionName: "deposited" },
      { ...vault, functionName: "windowEndsAt" },
      { ...vault, functionName: "challengeBond" },
      { ...vault, functionName: "unclaimedTotal" },
    ],
    query: { refetchInterval: 15000 },
  });

  const state = (data?.[0]?.result as number | undefined) ?? undefined;
  const prizePool = (data?.[1]?.result as bigint | undefined) ?? 0n;
  const deposited = (data?.[2]?.result as bigint | undefined) ?? 0n;
  const windowEndsAt = (data?.[3]?.result as bigint | undefined) ?? 0n;
  const unclaimedTotal = (data?.[5]?.result as bigint | undefined) ?? 0n;

  const stateName: VaultState | undefined =
    state !== undefined ? STATES[state] : undefined;

  return (
    <main className="mx-auto max-w-5xl px-5 pb-20">
      <TopBar />
      <StateRail current={stateName} />

      <div className="mt-6 grid gap-5 md:grid-cols-[1.4fr_1fr]">
        <VaultPanel
          stateName={stateName}
          prizePool={prizePool}
          deposited={deposited}
          windowEndsAt={windowEndsAt}
          unclaimedTotal={unclaimedTotal}
          onChanged={refetch}
        />
        <div className="flex flex-col gap-5">
          <SponsorPanel
            enabled={mounted && stateName === "Created" && isConnected}
            stateName={stateName}
            remaining={prizePool - deposited}
            onChanged={refetch}
          />
          <WinnerPanel
            address={address}
            stateName={stateName}
            onChanged={refetch}
          />
        </div>
      </div>

      <footer className="mt-10 text-center text-xs text-mut">
        Vault{" "}
        <a
          className="text-cyan hover:underline"
          href={`${arcTestnet.blockExplorers.default.url}/address/${VAULT_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
        >
          {shortAddr(VAULT_ADDRESS)}
        </a>{" "}
        on Arc Testnet · native USDC, 18 decimals · every state change is public
      </footer>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// Top bar
// ─────────────────────────────────────────────────────────────
function TopBar() {
  const mounted = useMounted();
  const { address, isConnected: connected } = useAccount();
  const isConnected = mounted && connected;
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <header className="flex items-center justify-between py-6">
      <div>
        <span className="text-2xl font-bold">Arc</span>
        <span className="text-2xl font-bold text-cyan">GG</span>
        <span className="ml-3 hidden text-xs tracking-[0.25em] text-mut sm:inline">
          GG, GET PAID
        </span>
      </div>
      {isConnected && address ? (
        <button
          onClick={() => disconnect()}
          className="rounded-lg border border-edge bg-card px-4 py-2 text-sm text-mut hover:text-white"
          title="Disconnect"
        >
          {shortAddr(address)}
        </button>
      ) : (
        <button
          onClick={() =>
            connect({ connector: connectors[0], chainId: arcTestnet.id })
          }
          className="rounded-lg bg-violet px-4 py-2 text-sm font-semibold hover:opacity-90"
        >
          Connect wallet
        </button>
      )}
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
// Signature element: the state rail — the contract's state machine, live
// ─────────────────────────────────────────────────────────────
function StateRail({ current }: { current?: VaultState }) {
  const offRail = current === "Challenged" || current === "Cancelled";
  return (
    <div className="rounded-2xl border border-edge bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        {RAIL.map((s, i) => {
          const active = s === current;
          return (
            <div key={s} className="flex items-center gap-2">
              <span
                className={
                  "rounded-lg px-3 py-1.5 text-xs font-semibold " +
                  (active
                    ? "bg-cyan text-ink"
                    : "border border-edge text-mut")
                }
              >
                {s}
              </span>
              {i < RAIL.length - 1 && <span className="text-edge">→</span>}
            </div>
          );
        })}
        {offRail && (
          <span className="ml-2 rounded-lg border border-danger px-3 py-1.5 text-xs font-semibold text-danger">
            {current}
          </span>
        )}
      </div>
      <p className="mt-3 text-xs text-mut">
        {current === undefined && "Reading vault state…"}
        {current === "Created" && "Collecting deposits. The tournament can't start until the pool is fully funded."}
        {current === "Funded" && "Pool locked in full. Waiting for the organizer to lock the roster and go live."}
        {current === "Live" && "Tournament running. The pot is locked — nobody can touch it, not even the admin."}
        {current === "ResultProposed" && "Result attested by the arbiters. Claims are allocated but locked until the challenge window closes."}
        {current === "Challenged" && "A participant disputed the result. Arbiters must re-resolve before the deadline."}
        {current === "Withdrawable" && "Challenge window closed clean. Winners can withdraw their claims."}
        {current === "Closed" && "All prizes withdrawn. Not one wei left behind. GG."}
        {current === "Cancelled" && "Tournament cancelled. Depositors can pull their refunds below."}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Vault panel — the money, made visible
// ─────────────────────────────────────────────────────────────
function VaultPanel({
  stateName,
  prizePool,
  deposited,
  windowEndsAt,
  unclaimedTotal,
  onChanged,
}: {
  stateName?: VaultState;
  prizePool: bigint;
  deposited: bigint;
  windowEndsAt: bigint;
  unclaimedTotal: bigint;
  onChanged: () => void;
}) {
  const pct =
    prizePool > 0n ? Number((deposited * 100n) / prizePool) : 0;

  return (
    <section className="rounded-2xl border border-edge bg-card p-6">
      <h2 className="text-xs font-semibold tracking-[0.2em] text-mut">
        PRIZE POOL
      </h2>
      <p className="mt-2 font-display text-5xl font-bold text-white">
        {fmtUsdc(prizePool)}{" "}
        <span className="text-xl text-cyan">USDC</span>
      </p>

      <div className="mt-5">
        <div className="flex justify-between text-xs text-mut">
          <span>Funded</span>
          <span>
            {fmtUsdc(deposited)} / {fmtUsdc(prizePool)} USDC
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet to-cyan transition-all"
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      {stateName === "ResultProposed" && (
        <ChallengeCountdown windowEndsAt={windowEndsAt} onElapsed={onChanged} />
      )}

      {(stateName === "Withdrawable" || stateName === "Closed") && (
        <p className="mt-5 text-sm text-mut">
          Unclaimed:{" "}
          <span className="font-display text-white">
            {fmtUsdc(unclaimedTotal)} USDC
          </span>
        </p>
      )}
    </section>
  );
}

function ChallengeCountdown({
  windowEndsAt,
  onElapsed,
}: {
  windowEndsAt: bigint;
  onElapsed: () => void;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });
  useEffect(() => {
    if (isSuccess) onElapsed();
  }, [isSuccess, onElapsed]);

  if (now === null) return null;
  const end = Number(windowEndsAt);
  const left = end - now;

  if (left <= 0) {
    return (
      <div className="mt-5 rounded-xl border border-edge bg-ink p-4">
        <p className="text-sm text-mut">
          Challenge window closed. Anyone can finalize:
        </p>
        <button
          onClick={() =>
            writeContract({ ...vaultWrite, functionName: "finalize", chainId: arcTestnet.id })
          }
          disabled={isPending}
          className="mt-2 rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Finalizing…" : "Finalize → Withdrawable"}
        </button>
      </div>
    );
  }

  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return (
    <div className="mt-5 rounded-xl border border-edge bg-ink p-4">
      <p className="text-xs tracking-[0.2em] text-mut">CHALLENGE WINDOW</p>
      <p className="mt-1 font-display text-3xl font-bold text-violet">
        {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:
        {String(s).padStart(2, "0")}
      </p>
      <p className="mt-1 text-xs text-mut">
        Claims are locked until the window closes. Disqualifications happen
        here — before any money moves.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sponsor panel — deposit native USDC
// ─────────────────────────────────────────────────────────────
const vaultWrite = { address: VAULT_ADDRESS, abi: vaultAbi } as const;

function SponsorPanel({
  enabled,
  stateName,
  remaining,
  onChanged,
}: {
  enabled: boolean;
  stateName?: VaultState;
  remaining: bigint;
  onChanged: () => void;
}) {
  const [amount, setAmount] = useState("1");
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      setConfirmed(amount);
      onChanged();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, onChanged]);

  return (
    <section className="rounded-2xl border border-edge bg-card p-6">
      <h2 className="text-xs font-semibold tracking-[0.2em] text-mut">
        SPONSOR
      </h2>
      <p className="mt-2 text-sm text-mut">
        Fund the pot with native USDC. Deposits lock on-chain — visible to
        every player before the first match.
      </p>
      <div className="mt-4 flex gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          className="w-24 rounded-lg border border-edge bg-ink px-3 py-2 font-display text-sm outline-none focus:border-violet"
          aria-label="Amount in USDC"
        />
        <button
          disabled={!enabled || isPending || isLoading}
          onClick={() =>
            writeContract({
              ...vaultWrite,
              functionName: "deposit",
              value: parseEther(amount),
              chainId: arcTestnet.id,
            })
          }
          className="flex-1 rounded-lg bg-violet px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-40"
        >
          {isPending || isLoading ? "Depositing…" : "Deposit USDC"}
        </button>
      </div>
      {isPending && <TxProgress label="Confirm the deposit in your wallet…" />}
      {isLoading && <TxProgress label="Depositing — waiting for on-chain confirmation…" />}
      {isSuccess && confirmed && !isPending && !isLoading && (
        <div className="mt-3 rounded-lg border border-cyan/40 bg-cyan/10 px-3 py-2 text-sm text-cyan">
          ✓ Deposited {confirmed} USDC — locked in the pool.
        </div>
      )}
      {stateName === "Created" && (
        <p className="mt-2 text-xs text-mut">
          {fmtUsdc(remaining)} USDC still needed to fully fund the pool.
        </p>
      )}
      {!enabled && stateName !== "Created" && (
        <p className="mt-2 text-xs text-mut">
          Deposits are only open while the vault is in Created.
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs text-danger">
          {(error as { shortMessage?: string }).shortMessage ?? error.message}
        </p>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Winner panel — locked claim, then withdraw
// ─────────────────────────────────────────────────────────────
function WinnerPanel({
  address,
  stateName,
  onChanged,
}: {
  address?: `0x${string}`;
  stateName?: VaultState;
  onChanged: () => void;
}) {
  const mounted = useMounted();
  const { data: claim } = useReadContract({
    ...vault,
    functionName: "claim",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15000 },
  });
  const { data: bondRefund } = useReadContract({
    ...vault,
    functionName: "bondRefund",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 30000 },
  });
  const { data: depositOf } = useReadContract({
    ...vault,
    functionName: "depositOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 30000 },
  });

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [paidOut, setPaidOut] = useState<string | null>(null);
  useEffect(() => {
    if (isSuccess) onChanged();
  }, [isSuccess, onChanged]);

  const myClaim = (claim as bigint | undefined) ?? 0n;
  const myBond = (bondRefund as bigint | undefined) ?? 0n;
  const myDeposit = (depositOf as bigint | undefined) ?? 0n;
  const canWithdraw = stateName === "Withdrawable" && myClaim > 0n;
  const canRefund = stateName === "Cancelled" && myDeposit > 0n;

  return (
    <section className="rounded-2xl border border-edge bg-card p-6">
      <h2 className="text-xs font-semibold tracking-[0.2em] text-mut">
        YOUR CLAIM
      </h2>
      {!mounted || !address ? (
        <p className="mt-2 text-sm text-mut">
          Connect your wallet to see your claim.
        </p>
      ) : (
        <>
          <p className="mt-2 font-display text-4xl font-bold">
            {fmtUsdc(myClaim)}{" "}
            <span className="text-lg text-cyan">USDC</span>
          </p>
          {myClaim > 0n && stateName === "ResultProposed" && (
            <p className="mt-1 text-xs text-mut">
              Allocated — locked until the challenge window closes.
            </p>
          )}
          <button
            disabled={!canWithdraw || isPending || isLoading}
            onClick={() => {
              setPaidOut(fmtUsdc(myClaim));
              writeContract({ ...vaultWrite, functionName: "withdraw", chainId: arcTestnet.id });
            }}
            className="mt-4 w-full rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-40"
          >
            {isPending || isLoading
              ? "Withdrawing…"
              : canWithdraw
                ? "Withdraw prize"
                : "Withdraw (opens in Withdrawable)"}
          </button>

          {isPending && <TxProgress label="Confirm in your wallet…" />}
          {isLoading && <TxProgress label="Withdrawing — waiting for confirmation…" />}
          {isSuccess && paidOut && !isPending && !isLoading && (
            <div className="mt-3 rounded-lg border border-cyan/40 bg-cyan/10 px-3 py-2 text-sm text-cyan">
              ✓ GG — {paidOut} USDC paid out to your wallet.
            </div>
          )}

          {myBond > 0n && (
            <button
              disabled={isPending || isLoading}
              onClick={() =>
                writeContract({
                  ...vaultWrite,
                  functionName: "claimBondRefund",
                  chainId: arcTestnet.id,
                })
              }
              className="mt-2 w-full rounded-lg border border-edge px-4 py-2 text-sm text-white hover:border-violet"
            >
              Reclaim challenge bond ({fmtUsdc(myBond)} USDC)
            </button>
          )}

          {canRefund && (
            <button
              disabled={isPending || isLoading}
              onClick={() =>
                writeContract({ ...vaultWrite, functionName: "refund", chainId: arcTestnet.id })
              }
              className="mt-2 w-full rounded-lg border border-edge px-4 py-2 text-sm text-white hover:border-violet"
            >
              Refund deposit ({fmtUsdc(myDeposit)} USDC)
            </button>
          )}
          {error && (
            <p className="mt-2 text-xs text-danger">
              {(error as { shortMessage?: string }).shortMessage ??
                error.message}
            </p>
          )}
        </>
      )}
    </section>
  );
}
