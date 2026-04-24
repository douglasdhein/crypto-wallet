"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
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

type ApiResponse = {
  message?: string;
};

export function UserSettings() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPasswordFormVisible, setIsPasswordFormVisible] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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
        setIsLoading(false);
      }
    }

    loadSession();
  }, []);

  async function handleUpdatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedbackMessage(null);
    setErrorMessage(null);

    try {
      setIsUpdatingPassword(true);

      const response = await fetch("/api/user/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: newPassword,
        }),
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setErrorMessage(result.message ?? "Nao foi possivel alterar a senha.");
        return;
      }

      setNewPassword("");
      setIsPasswordFormVisible(false);
      setFeedbackMessage(result.message ?? "Senha alterada com sucesso.");
    } catch {
      setErrorMessage("Nao foi possivel conectar ao servidor.");
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    setFeedbackMessage(null);
    setErrorMessage(null);

    try {
      setIsDeletingAccount(true);

      const response = await fetch("/api/user/account", {
        method: "DELETE",
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setErrorMessage(result.message ?? "Nao foi possivel deletar a conta.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setErrorMessage("Nao foi possivel conectar ao servidor.");
    } finally {
      setIsDeletingAccount(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <Link className={styles.backLink} href="/">
          Voltar ao dashboard
        </Link>

        <div className={styles.heading}>
          <p className={styles.brand}>Crypto Wallet</p>
          <h1 className={styles.title}>Configuracoes do usuario</h1>
          <p className={styles.description}>
            Consulte os dados principais da sua conta.
          </p>
        </div>

        {isLoading ? (
          <div className={styles.stateBox}>Carregando dados da conta...</div>
        ) : user ? (
          <div className={styles.profileBox}>
            <div className={styles.avatar} aria-hidden="true">
              {user.name.charAt(0).toUpperCase()}
            </div>

            <div className={styles.profileInfo}>
              <div>
                <span className={styles.label}>Nome</span>
                <p className={styles.value}>{user.name}</p>
              </div>

              <div>
                <span className={styles.label}>Email</span>
                <p className={styles.value}>{user.email}</p>
              </div>
            </div>

            <div className={styles.actionsBox}>
              {isPasswordFormVisible ? (
                <form
                  className={styles.passwordForm}
                  onSubmit={handleUpdatePassword}
                >
                  <label className={styles.field}>
                    <span>Nova senha</span>
                    <input
                      autoComplete="new-password"
                      className={styles.input}
                      disabled={isUpdatingPassword || isDeletingAccount}
                      minLength={8}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Digite a nova senha"
                      required
                      type="password"
                      value={newPassword}
                    />
                  </label>

                  <div className={styles.inlineActions}>
                    <button
                      className={styles.primaryButton}
                      disabled={isUpdatingPassword || isDeletingAccount}
                      type="submit"
                    >
                      {isUpdatingPassword ? "Alterando..." : "Salvar senha"}
                    </button>

                    <button
                      className={styles.secondaryButton}
                      disabled={isUpdatingPassword || isDeletingAccount}
                      onClick={() => {
                        setNewPassword("");
                        setIsPasswordFormVisible(false);
                      }}
                      type="button"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  className={styles.primaryButton}
                  disabled={isUpdatingPassword || isDeletingAccount}
                  onClick={() => {
                    setFeedbackMessage(null);
                    setErrorMessage(null);
                    setIsPasswordFormVisible(true);
                  }}
                  type="button"
                >
                  Alterar senha
                </button>
              )}

              <button
                className={styles.dangerButton}
                disabled={isUpdatingPassword || isDeletingAccount}
                onClick={handleDeleteAccount}
                type="button"
              >
                {isDeletingAccount ? "Deletando..." : "Deletar conta"}
              </button>

              {feedbackMessage ? (
                <p className={`${styles.feedback} ${styles.success}`}>
                  {feedbackMessage}
                </p>
              ) : null}

              {errorMessage ? (
                <p className={`${styles.feedback} ${styles.error}`}>
                  {errorMessage}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className={styles.stateBox}>
            <p>Voce precisa estar logado para acessar suas configuracoes.</p>
            <Link className={styles.loginLink} href="/login">
              Fazer login
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
