import type { Metadata } from "next";
import "@/styles/global.css";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: "Crypto Wallet",
  description: "Dashboard simples para acompanhar criptomoedas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={styles.html}>
      <body className={styles.body}>{children}</body>
    </html>
  );
}
