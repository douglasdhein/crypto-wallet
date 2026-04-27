"use client";

import { ChartNoAxesCombined, LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Theme } from "@/lib/theme";
import styles from "./style.module.css";

type SessionUser = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
};

type SessionResponse = {
  authenticated: boolean;
  user: SessionUser | null;
};

type AppHeaderProps = {
  initialTheme?: Theme;
};

export function AppHeader({ initialTheme = "dark" }: AppHeaderProps) {
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
        <ThemeToggle initialTheme={initialTheme} />

        <Link
          aria-label="Abrir portfolio"
          className={buttonVariants({
            className: styles.portfolioButton,
            size: "icon",
          })}
          href="/portfolio"
          title="Abrir portfolio"
        >
          <ChartNoAxesCombined
            aria-hidden="true"
            className={styles.actionIcon}
          />
        </Link>

        {user ? (
          <div className={styles.userActions}>
            <Link
              aria-label="Abrir configuracoes do usuario"
              className={buttonVariants({
                className: styles.userButton,
                size: "icon",
              })}
              href="/settings"
              title="Configuracoes do usuario"
            >
              <Settings aria-hidden="true" className={styles.actionIcon} />
            </Link>

            <Button
              className={styles.logoutButton}
              disabled={isLoggingOut}
              aria-label={isLoggingOut ? "Saindo da conta" : "Sair da conta"}
              onClick={handleLogout}
              size="icon"
              title={isLoggingOut ? "Saindo da conta" : "Sair da conta"}
              type="button"
            >
              <LogOut aria-hidden="true" className={styles.actionIcon} />
            </Button>
          </div>
        ) : (
          <Link
            aria-disabled={isLoadingSession}
            aria-label="Acessar login"
            className={buttonVariants({
              className: styles.loginButton,
              size: "icon",
            })}
            href="/login"
            title="Acessar login"
          >
            <User aria-hidden="true" className={styles.loginIcon} />
          </Link>
        )}
      </div>
    </header>
  );
}
