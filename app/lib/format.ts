import { formatEther } from "viem";

/** Native USDC (18 dec) -> human string, trimmed. */
export function fmtUsdc(wei: bigint, digits = 2): string {
  const s = formatEther(wei);
  const [int, frac = ""] = s.split(".");
  if (digits === 0) return int;
  const f = frac.slice(0, digits).padEnd(digits, "0");
  return `${int}.${f}`;
}

export function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
