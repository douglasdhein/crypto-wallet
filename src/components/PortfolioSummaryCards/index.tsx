'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import type { PortfolioCoin } from '@/components/PortfolioTable';
import styles from './style.module.css';

type PortfolioSummaryCardsProps = {
  coins: PortfolioCoin[];
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  currency: 'USD',
  maximumFractionDigits: 2,
  style: 'currency',
});

const signedCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  currency: 'USD',
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
  style: 'currency',
});

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  signDisplay: 'exceptZero',
  style: 'percent',
});

function formatPercent(value: number) {
  return percentFormatter.format(value / 100);
}

function getTone(value: number) {
  if (value > 0) {
    return 'positive';
  }

  if (value < 0) {
    return 'negative';
  }

  return 'neutral';
}

function getPreviousValue(currentValue: number, percentChange24h: number) {
  const changeRate = percentChange24h / 100;

  if (changeRate <= -0.9999) {
    return currentValue;
  }

  return currentValue / (1 + changeRate);
}

export function PortfolioSummaryCards({ coins }: PortfolioSummaryCardsProps) {
  const heldCoins = coins.filter((coin) => (coin.holdings ?? 0) > 0);
  const currentBalance = heldCoins.reduce(
    (total, coin) => total + (coin.holdings ?? 0) * coin.priceUsd,
    0,
  );
  const previous24hBalance = heldCoins.reduce((total, coin) => {
    const currentValue = (coin.holdings ?? 0) * coin.priceUsd;

    return total + getPreviousValue(currentValue, coin.percentChange24h);
  }, 0);
  const profitLoss24h = currentBalance - previous24hBalance;
  const profitLoss24hPercent =
    previous24hBalance > 0 ? (profitLoss24h / previous24hBalance) * 100 : 0;
  const totalCostBasis = heldCoins.reduce(
    (total, coin) => total + (coin.costBasisUsd ?? 0),
    0,
  );
  const totalProfitLoss = currentBalance - totalCostBasis;
  const totalProfitLossPercent =
    totalCostBasis > 0 ? (totalProfitLoss / totalCostBasis) * 100 : 0;
  const topPerformance =
    heldCoins.length > 0
      ? [...heldCoins].sort(
          (currentCoin, nextCoin) =>
            nextCoin.percentChange24h - currentCoin.percentChange24h,
        )[0]
      : null;
  const profitLoss24hTone = getTone(profitLoss24h);
  const totalProfitLossTone = getTone(totalProfitLoss);
  const topPerformanceTone = getTone(topPerformance?.percentChange24h ?? 0);

  return (
    <section aria-label="Resumo do portfólio" className={styles.summaryGrid}>
      <Card>
        <CardHeader>
          <CardTitle>Saldo Atual</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={styles.primaryValue}>
            {currencyFormatter.format(currentBalance)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mudança do Portfólio em 24h</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`${styles.primaryValue} ${styles[profitLoss24hTone]}`}>
            {signedCurrencyFormatter.format(profitLoss24h)}
          </p>
          <span className={`${styles.metaValue} ${styles[profitLoss24hTone]}`}>
            {formatPercent(profitLoss24hPercent)}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Total de Ganhos/Perdas</CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={`${styles.primaryValue} ${styles[totalProfitLossTone]}`}
          >
            {totalCostBasis > 0
              ? signedCurrencyFormatter.format(totalProfitLoss)
              : currencyFormatter.format(0)}
          </p>
          <span
            className={`${styles.metaValue} ${styles[totalProfitLossTone]}`}
          >
            {formatPercent(totalProfitLossPercent)}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Melhor Desempenho</CardTitle>
        </CardHeader>
        <CardContent>
          {topPerformance ? (
            <div className={styles.performanceContent}>
              {topPerformance.logoUrl ? (
                <Image
                  alt=""
                  className={styles.coinLogo}
                  height={32}
                  src={topPerformance.logoUrl}
                  width={32}
                />
              ) : (
                <span className={styles.coinFallback}>
                  {topPerformance.symbol.charAt(0)}
                </span>
              )}

              <div className={styles.performanceText}>
                <p className={styles.coinName}>{topPerformance.name}</p>
                <span
                  className={`${styles.metaValue} ${styles[topPerformanceTone]}`}
                >
                  {formatPercent(topPerformance.percentChange24h)}
                </span>
              </div>
            </div>
          ) : (
            <p className={styles.emptyValue}>Sem holdings</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
