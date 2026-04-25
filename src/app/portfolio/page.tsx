import { cookies } from 'next/headers';
import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { buttonVariants } from '@/components/Button';
import { getSessionFromToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { normalizeTheme, THEME_COOKIE_NAME } from '@/lib/theme';
import styles from './page.module.css';

export default async function PortfolioPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = getSessionFromToken(sessionToken);
  const initialTheme = normalizeTheme(cookieStore.get(THEME_COOKIE_NAME)?.value);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <AppHeader initialTheme={initialTheme} />

        <section className={styles.panel}>
          {user ? (
            <div className={styles.content}>
              <h1 className={styles.title}>
                Let&rsquo;s get started with your first portfolio!
              </h1>
              <p className={styles.description}>
                Track profits, losses and valuation all in one place.
              </p>
            </div>
          ) : (
            <div className={styles.content}>
              <h1 className={styles.title}>Crypto Portfolio Tracker</h1>
              <p className={styles.description}>
                Keep track of your profits, losses and portfolio valuation with
                our easy to use platform.
              </p>
              <Link
                className={buttonVariants({ className: styles.ctaButton })}
                href="/register"
              >
                Create Your Portfolio
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
