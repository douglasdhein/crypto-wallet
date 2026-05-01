'use client';

import { useEffect, useState } from 'react';
import styles from './style.module.css';

type GlobalMarketSummaryResponse = {
  data?: {
    marketCapChangePercentage24hUsd: number;
    totalMarketCapUsd: number;
  };
  message?: string;
};

const compactCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  compactDisplay: 'short',
  currency: 'USD',
  maximumFractionDigits: 2,
  notation: 'compact',
  style: 'currency',
});

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  signDisplay: 'exceptZero',
  style: 'percent',
});

function formatPercent(value: number) {
  return percentFormatter.format(value / 100);
}

export function GlobalMarketSummary() {
  const [marketCapUsd, setMarketCapUsd] = useState<number | null>(null);
  const [marketCapChange24h, setMarketCapChange24h] = useState<number | null>(
    null,
  );
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGlobalMarketData() {
      try {
        const response = await fetch('/api/crypto/global', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const result = (await response.json()) as GlobalMarketSummaryResponse;

        if (!response.ok || !result.data) {
          throw new Error(
            result.message ??
              'Não foi possível carregar os dados globais do mercado.',
          );
        }

        setMarketCapUsd(result.data.totalMarketCapUsd);
        setMarketCapChange24h(result.data.marketCapChangePercentage24hUsd);
        setFeedbackMessage(null);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setFeedbackMessage(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os dados globais do mercado.',
        );
      }
    }

    loadGlobalMarketData();

    return () => {
      controller.abort();
    };
  }, []);

  const hasGlobalMarketData =
    typeof marketCapUsd === 'number' && typeof marketCapChange24h === 'number';

  return (
    <section className={styles.summary}>
      <h1 className={styles.title}>
        Fique por dentro do mundo das criptomoedas.
      </h1>

      {hasGlobalMarketData ? (
        <p className={styles.description}>
          A capitalização global de mercado para criptomoedas no dia de hoje é
          de{' '}
          <span className={styles.highlight}>
            {compactCurrencyFormatter.format(marketCapUsd)}
          </span>
          , uma diferença de{' '}
          <span className={styles.highlight}>
            {formatPercent(marketCapChange24h)}
          </span>{' '}
          nas últimas 24 horas.
        </p>
      ) : (
        <p className={styles.description}>
          {feedbackMessage ??
            'Carregando dados globais do mercado de criptomoedas'}
        </p>
      )}
    </section>
  );
}
