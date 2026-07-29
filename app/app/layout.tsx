import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ArcGG — GG, get paid",
  description:
    "Auto-arbitrated esports prize pools on Arc. Sponsors lock USDC upfront, winners withdraw after a clean challenge window.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
