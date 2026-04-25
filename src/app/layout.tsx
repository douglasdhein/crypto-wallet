import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist } from "next/font/google";
import "@/styles/global.css";
import { normalizeTheme, THEME_COOKIE_NAME } from "@/lib/theme";
import styles from "./layout.module.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Crypto Wallet",
  description: "Dashboard simples para acompanhar criptomoedas.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = normalizeTheme(cookieStore.get(THEME_COOKIE_NAME)?.value);

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${styles.html}`}
      data-theme={theme}
      suppressHydrationWarning
    >
      <body className={styles.body}>{children}</body>
    </html>
  );
}
