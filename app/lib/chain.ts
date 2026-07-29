import { defineChain } from "viem";

/**
 * Arc Testnet — Circle's stablecoin-native L1.
 * The native currency IS USDC, at 18 decimals (msg.value scale).
 * The 6-decimal ERC-20 interface at 0x3600...0000 is deliberately not used.
 */
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  blockExplorers: {
    default: { name: "Arcscan", url: "https://testnet.arcscan.app" },
  },
  testnet: true,
});

export const VAULT_ADDRESS = "0x12e780a6636Ca12520D5eF6e8933632877FdF453" as const;
