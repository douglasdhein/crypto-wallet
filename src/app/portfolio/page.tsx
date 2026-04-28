import { cookies } from "next/headers";
import { AppHeader } from "@/components/AppHeader";
import { PortfolioPanel } from "@/components/PortfolioPanel";
import { getSessionFromToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { normalizeTheme, THEME_COOKIE_NAME } from "@/lib/theme";
import styles from "./page.module.css";

export default async function PortfolioPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = getSessionFromToken(sessionToken);
  const initialTheme = normalizeTheme(cookieStore.get(THEME_COOKIE_NAME)?.value);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <AppHeader initialTheme={initialTheme} />

        <PortfolioPanel isAuthenticated={Boolean(user)} />
      </div>
    </main>
  );
}
