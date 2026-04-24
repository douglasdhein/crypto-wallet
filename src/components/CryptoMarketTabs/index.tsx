'use client';

import { useMemo, useState } from 'react';
import styles from './style.module.css';

type MarketTableKey = 'top' | 'trending';
type RowTone = 'positive' | 'negative';

type MarketTable = {
  key: MarketTableKey;
  label: string;
  status: string;
};

type PlaceholderRow = {
  rank: number;
  tone: RowTone;
};

const marketTables: MarketTable[] = [
  {
    key: 'top',
    label: 'Top',
    status: 'Aguardando API',
  },
  {
    key: 'trending',
    label: 'Trending',
    status: 'Aguardando API',
  },
];

const placeholderRows: PlaceholderRow[] = [
  {
    rank: 1,
    tone: 'positive',
  },
  {
    rank: 2,
    tone: 'negative',
  },
  {
    rank: 3,
    tone: 'positive',
  },
  {
    rank: 4,
    tone: 'negative',
  },
  {
    rank: 5,
    tone: 'positive',
  },
];

export function CryptoMarketTabs() {
  const [activeTableKey, setActiveTableKey] = useState<MarketTableKey>('top');

  const activeTable = useMemo(
    () =>
      marketTables.find((table) => table.key === activeTableKey) ??
      marketTables[0],
    [activeTableKey],
  );

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.tabs}>
          {marketTables.map((table) => {
            const isActive = table.key === activeTableKey;

            return (
              <button
                aria-pressed={isActive}
                className={`${styles.tabButton} ${
                  isActive ? styles.tabButtonActive : styles.tabButtonInactive
                }`}
                key={table.key}
                onClick={() => setActiveTableKey(table.key)}
                type="button"
              >
                <span>{table.label}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.status}>
          <span className={styles.statusIndicator} />
          {activeTable.status}
        </div>
      </div>

      <div className={styles.tableScroller}>
        <table className={styles.table}>
          <thead className={styles.tableHead}>
            <tr>
              <th className={styles.rankHeader}>#</th>
              <th>Nome</th>
              <th>Preco</th>
              <th>24h</th>
              <th>Market cap</th>
              <th>Ultimos 7 dias</th>
            </tr>
          </thead>
          <tbody>
            {placeholderRows.map((row) => (
              <tr
                className={styles.tableRow}
                key={`${activeTable.key}-${row.rank}`}
              >
                <td className={styles.rankCell}>{row.rank}</td>
                <td>
                  <div className={styles.coinCell}>
                    <div className={styles.coinIconSkeleton} />
                    <div>
                      <div className={styles.coinNameSkeleton} />
                      <div className={styles.coinSymbolSkeleton} />
                    </div>
                  </div>
                </td>
                <td>
                  <div className={styles.priceSkeleton} />
                </td>
                <td>
                  <div
                    className={`${styles.changeSkeleton} ${
                      row.tone === 'positive'
                        ? styles.positiveSkeleton
                        : styles.negativeSkeleton
                    }`}
                  />
                </td>
                <td>
                  <div className={styles.marketCapSkeleton} />
                </td>
                <td>
                  <div
                    className={`${styles.chartSkeleton} ${
                      row.tone === 'positive'
                        ? styles.positiveSkeleton
                        : styles.negativeSkeleton
                    }`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
