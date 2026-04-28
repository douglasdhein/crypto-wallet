import Link from "next/link";
import styles from "./style.module.css";

export function AppLogo() {
  return (
    <Link aria-label="Ir para a pagina inicial" className={styles.logoLink} href="/">
      <svg
        aria-labelledby="crypto-wallet-logo-light-title crypto-wallet-logo-light-desc"
        className={`${styles.logo} ${styles.lightLogo}`}
        fill="none"
        role="img"
        viewBox="0 0 940 240"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title id="crypto-wallet-logo-light-title">Crypto Wallet</title>
        <desc id="crypto-wallet-logo-light-desc">
          Logo Crypto Wallet com C personalizado em formato de cripto/circuito
          para uso em tema claro.
        </desc>

        <g stroke="#0B0B0B" strokeLinecap="round" strokeLinejoin="round">
          <path d="M158 70 A72 72 0 1 0 158 170" strokeWidth="18" />
          <path d="M128 74H102L78 96V118H112" strokeWidth="5" />
          <path d="M78 118V144L102 166H128" strokeWidth="5" />
          <circle cx="132" cy="74" fill="#FFFFFF" r="10" strokeWidth="5" />
          <circle cx="112" cy="118" fill="#FFFFFF" r="10" strokeWidth="5" />
          <circle cx="132" cy="166" fill="#FFFFFF" r="10" strokeWidth="5" />
        </g>

        <text
          fill="#0B0B0B"
          fontFamily="Inter, Avenir Next, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
          fontSize="78"
          fontWeight="700"
          letterSpacing="-2.5"
          x="176"
          y="146"
        >
          rypto
        </text>

        <text
          fill="#0B0B0B"
          fontFamily="Inter, Avenir Next, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
          fontSize="78"
          fontWeight="300"
          letterSpacing="-2"
          x="398"
          y="146"
        >
          Wallet
        </text>
      </svg>

      <svg
        aria-labelledby="crypto-wallet-logo-dark-title crypto-wallet-logo-dark-desc"
        className={`${styles.logo} ${styles.darkLogo}`}
        fill="none"
        role="img"
        viewBox="0 0 940 240"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title id="crypto-wallet-logo-dark-title">Crypto Wallet</title>
        <desc id="crypto-wallet-logo-dark-desc">
          Logo Crypto Wallet com C personalizado em formato de cripto/circuito
          para uso em tema escuro.
        </desc>

        <g stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round">
          <path d="M158 70 A72 72 0 1 0 158 170" strokeWidth="18" />
          <path d="M128 74H102L78 96V118H112" strokeWidth="5" />
          <path d="M78 118V144L102 166H128" strokeWidth="5" />
          <circle cx="132" cy="74" fill="#0B0B0B" r="10" strokeWidth="5" />
          <circle cx="112" cy="118" fill="#0B0B0B" r="10" strokeWidth="5" />
          <circle cx="132" cy="166" fill="#0B0B0B" r="10" strokeWidth="5" />
        </g>

        <text
          fill="#FFFFFF"
          fontFamily="Inter, Avenir Next, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
          fontSize="78"
          fontWeight="700"
          letterSpacing="-2.5"
          x="176"
          y="146"
        >
          rypto
        </text>

        <text
          fill="#FFFFFF"
          fontFamily="Inter, Avenir Next, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
          fontSize="78"
          fontWeight="300"
          letterSpacing="-2"
          x="398"
          y="146"
        >
          Wallet
        </text>
      </svg>
    </Link>
  );
}
