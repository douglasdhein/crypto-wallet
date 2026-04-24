"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./style.module.css";

type SessionUser = {
  id: string;
  name: string;
  email: string;
};

type SessionResponse = {
  authenticated: boolean;
  user: SessionUser | null;
};

export function AppHeader() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        const session = (await response.json()) as SessionResponse;

        setUser(session.user);
      } catch {
        setUser(null);
      } finally {
        setIsLoadingSession(false);
      }
    }

    loadSession();
  }, []);

  async function handleLogout() {
    try {
      setIsLoggingOut(true);
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      setUser(null);
      window.location.reload();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className={styles.header}>
      <div>
        <p className={styles.brand}>Crypto Wallet</p>
        <h1 className={styles.title}>Dashboard de criptomoedas</h1>
      </div>

      <div className={styles.actions}>
        <div className={styles.status}>
          <span className={styles.statusIndicator} />
          {user ? "Sessao ativa" : "Base inicial"}
        </div>

        {user ? (
          <div className={styles.userActions}>
            <Link
              aria-label="Abrir configuracoes do usuario"
              className={styles.userButton}
              href="/settings"
              title="Configuracoes do usuario"
            >
              <span className={styles.userIcon} aria-hidden="true" />
            </Link>

            <button
              className={styles.logoutButton}
              disabled={isLoggingOut}
              onClick={handleLogout}
              type="button"
            >
              {isLoggingOut ? "Saindo..." : "Sair"}
            </button>
          </div>
        ) : (
          <Link
            className={styles.loginButton}
            href="/login"
            aria-disabled={isLoadingSession}
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
