'use client';

import { User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
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

type ApiResponse = {
  message?: string;
  user?: SessionUser;
};

type ActiveModal = 'password' | 'delete' | null;

export function UserSettings() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordAlertMessage, setPasswordAlertMessage] = useState<
    string | null
  >(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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
        setIsLoading(false);
      }
    }

    loadSession();
  }, []);

  async function handleUpdateUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedbackMessage(null);
    setErrorMessage(null);

    try {
      setIsUpdatingUsername(true);

      const response = await fetch('/api/user/username', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
        }),
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setErrorMessage(
          result.message ?? 'Não foi possível salvar o username.',
        );
        return;
      }

      if (result.user) {
        setUser(result.user);
      }

      setUsername('');
      setFeedbackMessage(result.message ?? 'Username salvo com sucesso.');
    } catch {
      setErrorMessage('Não foi possível conectar ao servidor.');
    } finally {
      setIsUpdatingUsername(false);
    }
  }

  async function handleUpdatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedbackMessage(null);
    setErrorMessage(null);
    setPasswordAlertMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordAlertMessage('As senhas digitadas precisam ser iguais.');
      return;
    }

    try {
      setIsUpdatingPassword(true);

      const response = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: newPassword,
        }),
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setErrorMessage(result.message ?? 'Não foi possível alterar a senha.');
        return;
      }

      setNewPassword('');
      setConfirmPassword('');
      setActiveModal(null);
      setFeedbackMessage(result.message ?? 'Senha alterada com sucesso.');
    } catch {
      setErrorMessage('Não foi possível conectar ao servidor.');
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    setFeedbackMessage(null);
    setErrorMessage(null);
    setIsDeletingAccount(true);

    try {
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setErrorMessage(result.message ?? 'Não foi possível deletar a conta.');
        setActiveModal(null);
        setIsDeletingAccount(false);
        return;
      }

      setActiveModal(null);
      setIsDeletingAccount(false);
      router.push('/');
      router.refresh();
    } catch {
      setErrorMessage('Não foi possível conectar ao servidor.');
      setActiveModal(null);
      setIsDeletingAccount(false);
    }
  }

  return (
    <>
      <section className={styles.panel}>
        <div className={styles.heading}>
          <h1 className={styles.title}>Configurações do Usuário</h1>
          <p className={styles.description}>
            Consulte os dados principais da sua conta.
          </p>
        </div>

        {isLoading ? (
          <div className={styles.stateBox}>Carregando dados da conta</div>
        ) : user ? (
          <div className={styles.profileBox}>
            <div className={styles.profileHero}>
              <div className={styles.avatar} aria-hidden="true">
                <User className={styles.avatarIcon} />
              </div>

              <div className={styles.profileSummary}>
                <p className={styles.profileName}>{user.name}</p>
                <p className={styles.profileEmail}>{user.email}</p>
              </div>
            </div>

            <div className={styles.profileInfo}>
              <div className={styles.profileItem}>
                <span className={styles.label}>Nome</span>
                <p className={styles.value}>{user.name}</p>
              </div>

              <div className={styles.profileItem}>
                <span className={styles.label}>Username</span>
                <p className={styles.value}>
                  {user.username ? (
                    user.username
                  ) : (
                    <span className={styles.emptyValue}>Não informado</span>
                  )}
                </p>
              </div>

              <div className={styles.profileItem}>
                <span className={styles.label}>E-mail</span>
                <p className={styles.value}>{user.email}</p>
              </div>
            </div>

            <div className={styles.actionsBox}>
              <div className={styles.inlineActions}>
                <button
                  className={styles.primaryButton}
                  disabled={
                    isUpdatingUsername ||
                    isUpdatingPassword ||
                    isDeletingAccount
                  }
                  onClick={() => {
                    setFeedbackMessage(null);
                    setErrorMessage(null);
                    setPasswordAlertMessage(null);
                    setActiveModal('password');
                  }}
                  type="button"
                >
                  Alterar Senha
                </button>

                <button
                  className={styles.dangerButton}
                  disabled={
                    isUpdatingUsername ||
                    isUpdatingPassword ||
                    isDeletingAccount
                  }
                  onClick={() => {
                    setFeedbackMessage(null);
                    setErrorMessage(null);
                    setActiveModal('delete');
                  }}
                  type="button"
                >
                  Deletar Conta
                </button>
              </div>

              {!user.username ? (
                <form
                  className={styles.usernameForm}
                  onSubmit={handleUpdateUsername}
                >
                  <label className={styles.field}>
                    <span>Definir Username</span>
                    <input
                      autoComplete="username"
                      className={styles.input}
                      disabled={
                        isUpdatingUsername ||
                        isUpdatingPassword ||
                        isDeletingAccount
                      }
                      maxLength={30}
                      minLength={3}
                      onChange={(event) => setUsername(event.target.value)}
                      pattern="[a-zA-Z0-9_]+"
                      placeholder="seu_username"
                      required
                      type="text"
                      value={username}
                    />
                  </label>

                  <button
                    className={styles.primaryButton}
                    disabled={
                      isUpdatingUsername ||
                      isUpdatingPassword ||
                      isDeletingAccount
                    }
                    type="submit"
                  >
                    {isUpdatingUsername ? 'Salvando' : 'Salvar username'}
                  </button>
                </form>
              ) : null}

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
            <p>Você precisa estar logado para acessar suas configurações.</p>
            <Link className={styles.loginLink} href="/login">
              Fazer Login
            </Link>
          </div>
        )}
      </section>

      {activeModal === 'password' ? (
        <div className={styles.modalOverlay}>
          <form
            aria-labelledby="password-alert-title"
            aria-modal="true"
            className={styles.passwordAlert}
            onSubmit={handleUpdatePassword}
            role="dialog"
          >
            <p className={styles.passwordAlertTitle} id="password-alert-title">
              Alterar Senha
            </p>

            <label className={styles.field}>
              <span>Nova Senha</span>
              <input
                autoComplete="new-password"
                className={styles.input}
                disabled={
                  isUpdatingUsername || isUpdatingPassword || isDeletingAccount
                }
                minLength={8}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Digite a nova senha"
                required
                type="password"
                value={newPassword}
              />
            </label>

            <label className={styles.field}>
              <span>Confirmar Senha</span>
              <input
                autoComplete="new-password"
                className={styles.input}
                disabled={
                  isUpdatingUsername || isUpdatingPassword || isDeletingAccount
                }
                minLength={8}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Digite a senha novamente"
                required
                type="password"
                value={confirmPassword}
              />
            </label>

            {passwordAlertMessage ? (
              <p className={`${styles.feedback} ${styles.error}`}>
                {passwordAlertMessage}
              </p>
            ) : null}

            <div className={styles.passwordAlertActions}>
              <button
                className={styles.primaryButton}
                disabled={
                  isUpdatingUsername || isUpdatingPassword || isDeletingAccount
                }
                type="submit"
              >
                {isUpdatingPassword ? 'Alterando' : 'Confirmar'}
              </button>

              <button
                className={styles.secondaryButton}
                disabled={isUpdatingPassword}
                onClick={() => {
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordAlertMessage(null);
                  setActiveModal(null);
                }}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {activeModal === 'delete' ? (
        <div className={styles.modalOverlay}>
          <div
            aria-labelledby="delete-account-title"
            aria-modal="true"
            className={styles.deleteAlert}
            role="alertdialog"
          >
            <p className={styles.deleteAlertText} id="delete-account-title">
              Você tem certeza de que deseja excluir sua conta?
            </p>

            <div className={styles.deleteAlertActions}>
              <button
                className={styles.dangerButton}
                disabled={
                  isUpdatingUsername || isUpdatingPassword || isDeletingAccount
                }
                onClick={handleDeleteAccount}
                type="button"
              >
                {isDeletingAccount ? 'Deletando' : 'Sim'}
              </button>

              <button
                className={styles.secondaryButton}
                disabled={isDeletingAccount}
                onClick={() => setActiveModal(null)}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
