import Link from "next/link";
import styles from "./style.module.css";

export function AppHeader() {
  return (
    <header className={styles.header}>
      <div>
        <p className={styles.brand}>Crypto Wallet</p>
        <h1 className={styles.title}>Dashboard de criptomoedas</h1>
      </div>

      <div className={styles.actions}>
        <div className={styles.status}>
          <span className={styles.statusIndicator} />
          Base inicial
        </div>

        <Link className={styles.loginButton} href="/login">
          Login
        </Link>
      </div>
    </header>
  );
}
