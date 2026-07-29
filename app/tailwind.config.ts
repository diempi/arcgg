import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0E1A",
        card: "#121A2E",
        edge: "#232D47",
        violet: "#7B61FF",
        cyan: "#22D3C5",
        mut: "#8B94A8",
        danger: "#E58A97",
      },
      fontFamily: {
        display: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      keyframes: {
        "tx-slide": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(300%)" },
        },
      },
      animation: {
        "tx-slide": "tx-slide 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
