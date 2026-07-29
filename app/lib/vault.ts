import { vaultAbi } from "./abi";

export { vaultAbi };

export const STATES = [
  "Created",
  "Funded",
  "Live",
  "ResultProposed",
  "Challenged",
  "Withdrawable",
  "Closed",
  "Cancelled",
] as const;

export type VaultState = (typeof STATES)[number];

/** The happy-path rail, in on-chain enum order but displayed linearly. */
export const RAIL: VaultState[] = [
  "Created",
  "Funded",
  "Live",
  "ResultProposed",
  "Withdrawable",
  "Closed",
];
