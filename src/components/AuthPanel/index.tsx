"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./style.module.css";

type AuthPanelMode = "login" | "register";
type MessageType = "success" | "error" | "info";
type FieldErrors = Partial<Record<"name" | "email" | "password", string>>;

type AuthPanelProps = {
  mode: AuthPanelMode;
};

type RegisterApiResponse = {
  message?: string;
  errors?: FieldErrors;
};

type AuthApiResponse = RegisterApiResponse & {
  user?: {
    id: string;
    name: string;
    email: string;
  };
};

const authContent = {
  login: {
    title: "Entrar na conta",
    description: "Acesse seu dashboard para acompanhar suas criptomoedas.",
    buttonLabel: "Entrar",
    footerText: "Ainda nao tem uma conta?",
    footerLinkLabel: "Criar cadastro",
    footerHref: "/register",
  },
  register: {
    title: "Criar cadastro",
    description: "Crie sua conta para salvar preferencias e evoluir o painel.",
    buttonLabel: "Cadastrar",
    footerText: "Ja tem uma conta?",
    footerLinkLabel: "Fazer login",
    footerHref: "/login",
  },
};

function getFormValue(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value : "";
}

export function AuthPanel({ mode }: AuthPanelProps) {
  const router = useRouter();
  const content = authContent[mode];
  const isRegister = mode === "register";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{
    type: MessageType;
    text: string;
  } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFieldErrors({});
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    const payload = {
      name: getFormValue(formData, "name"),
      email: getFormValue(formData, "email"),
      password: getFormValue(formData, "password"),
    };

    try {
      setIsSubmitting(true);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as AuthApiResponse;

      if (!response.ok) {
        setFieldErrors(result.errors ?? {});
        setMessage({
          type: "error",
          text: result.message ?? "Nao foi possivel realizar o cadastro.",
        });
        return;
      }

      form.reset();
      setMessage({
        type: "success",
        text: result.message ?? "Operacao realizada com sucesso.",
      });

      if (!isRegister) {
        router.push("/");
        router.refresh();
      }
    } catch {
      setMessage({
        type: "error",
        text: "Nao foi possivel conectar ao servidor.",
      });
    } finally {
      setIsSubmitting(false);
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
          <h1 className={styles.title}>{content.title}</h1>
          <p className={styles.description}>{content.description}</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {isRegister ? (
            <label className={styles.field}>
              <span>Nome</span>
              <input
                autoComplete="name"
                className={styles.input}
                disabled={isSubmitting}
                minLength={2}
                name="name"
                placeholder="Seu nome"
                required
                type="text"
              />
              {fieldErrors.name ? (
                <span className={styles.fieldError}>{fieldErrors.name}</span>
              ) : null}
            </label>
          ) : null}

          <label className={styles.field}>
            <span>Email</span>
            <input
              autoComplete="email"
              className={styles.input}
              disabled={isSubmitting}
              name="email"
              placeholder="voce@email.com"
              required
              type="email"
            />
            {fieldErrors.email ? (
              <span className={styles.fieldError}>{fieldErrors.email}</span>
            ) : null}
          </label>

          <label className={styles.field}>
            <span>Senha</span>
            <input
              autoComplete={isRegister ? "new-password" : "current-password"}
              className={styles.input}
              disabled={isSubmitting}
              minLength={isRegister ? 8 : undefined}
              name="password"
              placeholder="Sua senha"
              required
              type="password"
            />
            {fieldErrors.password ? (
              <span className={styles.fieldError}>
                {fieldErrors.password}
              </span>
            ) : null}
          </label>

          {message ? (
            <p
              aria-live="polite"
              className={`${styles.feedback} ${styles[message.type]}`}
            >
              {message.text}
            </p>
          ) : null}

          <button
            className={styles.submitButton}
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Enviando..." : content.buttonLabel}
          </button>
        </form>

        <p className={styles.footerText}>
          {content.footerText}{" "}
          <Link className={styles.footerLink} href={content.footerHref}>
            {content.footerLinkLabel}
          </Link>
        </p>
      </section>
    </main>
  );
}
