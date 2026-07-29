import { NextRequest, NextResponse } from "next/server";

const ARC_RPC = "https://rpc.testnet.arc.network";
const TTL_MS = 5000;      // per-call cache
const SPACING_MS = 400;   // gap between upstream requests (Arc rate-limits bursts)

type RpcReq = { jsonrpc: string; id: unknown; method: string; params?: unknown };
type RpcRes = { jsonrpc: string; id: unknown; result?: unknown; error?: { code: number; message: string } };

const cache = new Map<string, { at: number; res: RpcRes }>();

// Global sequential queue: all upstream calls, across all clients, are spaced out.
let chain: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task);
  chain = run.then(
    () => new Promise((r) => setTimeout(r, SPACING_MS)),
    () => new Promise((r) => setTimeout(r, SPACING_MS)),
  );
  return run;
}

async function callUpstream(r: RpcReq): Promise<RpcRes> {
  const res = await fetch(ARC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(r),
  });
  return (await res.json()) as RpcRes;
}

async function handleOne(r: RpcReq): Promise<RpcRes> {
  const cacheable = r.method === "eth_call" || r.method === "eth_chainId";
  const key = cacheable ? JSON.stringify([r.method, r.params]) : "";

  if (cacheable) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) return { ...hit.res, id: r.id };
  }

  let out = await enqueue(() => callUpstream(r));
  if (out.error?.code === -32011) {
    // rate-limited despite spacing: one patient retry
    await new Promise((res) => setTimeout(res, 1200));
    out = await enqueue(() => callUpstream(r));
  }

  if (cacheable && !out.error) {
    cache.set(key, { at: Date.now(), res: out });
    if (cache.size > 200) cache.clear();
  }
  return { ...out, id: r.id };
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  let parsed: unknown;
  try { parsed = JSON.parse(body); } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  if (Array.isArray(parsed)) {
    const out: RpcRes[] = [];
    for (const r of parsed as RpcReq[]) out.push(await handleOne(r)); // sequential
    return NextResponse.json(out);
  }
  return NextResponse.json(await handleOne(parsed as RpcReq));
}