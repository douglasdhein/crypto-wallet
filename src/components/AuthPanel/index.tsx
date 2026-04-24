import Link from "next/link";
import styles from "./style.module.css";

type AuthPanelMode = "login" | "register";

type AuthPanelProps = {
  mode: AuthPanelMode;
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

export function AuthPanel({ mode }: AuthPanelProps) {
  const content = authContent[mode];
  const isRegister = mode === "register";

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

        <form className={styles.form}>
          {isRegister ? (
            <label className={styles.field}>
              <span>Nome</span>
              <input
                autoComplete="name"
                className={styles.input}
                name="name"
                placeholder="Seu nome"
                type="text"
              />
            </label>
          ) : null}

          <label className={styles.field}>
            <span>Email</span>
            <input
              autoComplete="email"
              className={styles.input}
              name="email"
              placeholder="voce@email.com"
              type="email"
            />
          </label>

          <label className={styles.field}>
            <span>Senha</span>
            <input
              autoComplete={isRegister ? "new-password" : "current-password"}
              className={styles.input}
              name="password"
              placeholder="Sua senha"
              type="password"
            />
          </label>

          <button className={styles.submitButton} type="button">
            {content.buttonLabel}
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
