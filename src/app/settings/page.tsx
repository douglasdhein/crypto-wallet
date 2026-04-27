import { cookies } from "next/headers";
import { AppHeader } from "@/components/AppHeader";
import { UserSettings } from "@/components/UserSettings";
import { normalizeTheme, THEME_COOKIE_NAME } from "@/lib/theme";
import styles from "./page.module.css";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const initialTheme = normalizeTheme(cookieStore.get(THEME_COOKIE_NAME)?.value);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <AppHeader initialTheme={initialTheme} />

        <div className={styles.settingsContent}>
          <UserSettings />
        </div>
      </div>
    </main>
  );
}
