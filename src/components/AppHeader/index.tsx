'use client';

import {
  ChartNoAxesCombined,
  House,
  LogOut,
  Settings,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppLogo } from '@/components/AppLogo';
import { Button, buttonVariants } from '@/components/Button';
import { ThemeToggle } from '@/components/ThemeToggle';
import type { Theme } from '@/lib/theme';
import styles from './style.module.css';

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

export function AppHeader({ initialTheme = 'dark' }: AppHeaderProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const shouldShowHomeButton =
    pathname === '/portfolio' || pathname === '/settings';

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch('/api/auth/session', {
          cache: 'no-store',
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
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      setUser(null);
      window.location.reload();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className={styles.header}>
      <AppLogo />

      <div className={styles.actions}>
        <ThemeToggle initialTheme={initialTheme} />

        {shouldShowHomeButton ? (
          <Link
            aria-label="Página Inicial"
            className={buttonVariants({
              className: styles.homeButton,
              size: 'icon',
            })}
            href="/"
            title="Página Inicial"
          >
            <House aria-hidden="true" className={styles.actionIcon} />
          </Link>
        ) : null}

        <Link
          aria-label="Portfolio"
          className={buttonVariants({
            className: styles.portfolioButton,
            size: 'icon',
          })}
          href="/portfolio"
          title="Portfolio"
        >
          <ChartNoAxesCombined
            aria-hidden="true"
            className={styles.actionIcon}
          />
        </Link>

        {user ? (
          <div className={styles.userActions}>
            <Link
              aria-label="Configurações"
              className={buttonVariants({
                className: styles.userButton,
                size: 'icon',
              })}
              href="/settings"
              title="Configurações"
            >
              <Settings aria-hidden="true" className={styles.actionIcon} />
            </Link>

            <Button
              className={styles.logoutButton}
              disabled={isLoggingOut}
              aria-label={isLoggingOut ? 'Sair' : 'Sair'}
              onClick={handleLogout}
              size="icon"
              title={isLoggingOut ? 'Sair' : 'Sair'}
              type="button"
            >
              <LogOut aria-hidden="true" className={styles.actionIcon} />
            </Button>
          </div>
        ) : (
          <Link
            aria-disabled={isLoadingSession}
            aria-label="Acessar"
            className={buttonVariants({
              className: styles.loginButton,
              size: 'icon',
            })}
            href="/login"
            title="Acessar"
          >
            <User aria-hidden="true" className={styles.loginIcon} />
          </Link>
        )}
      </div>
    </header>
  );
}
