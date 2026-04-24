import { AppHeader } from "@/components/AppHeader";
import { CryptoMarketTabs } from "@/components/CryptoMarketTabs";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <AppHeader />
        <CryptoMarketTabs />
      </div>
    </main>
  );
}
