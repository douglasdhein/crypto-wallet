'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/Table';
import styles from './style.module.css';

type MarketTableKey = 'top' | 'trending';
type RowTone = 'positive' | 'negative';

type MarketTable = {
  key: MarketTableKey;
  label: string;
};

type CryptoMarketItem = {
  id: string;
  rank: number;
  name: string;
  symbol: string;
  logoUrl: string | null;
  priceUsd: number;
  percentChange24h: number;
  percentChange7d: number;
  marketCapUsd: number;
  sparklinePrices: number[];
  lastUpdated: string | null;
};

type CryptoMarketResponse = {
  data?: CryptoMarketItem[];
  message?: string;
  updatedAt?: string;
};

type MarketState = {
  data: CryptoMarketItem[];
  error: string | null;
  isLoading: boolean;
  updatedAt: string | null;
};

const SEARCH_DEBOUNCE_MS = 400;

const marketTables: MarketTable[] = [
  {
    key: 'top',
    label: 'Top',
  },
  {
    key: 'trending',
    label: 'Trending',
  },
];

function createInitialMarketState(): MarketState {
  return {
    data: [],
    error: null,
    isLoading: false,
    updatedAt: null,
  };
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  currency: 'USD',
  maximumFractionDigits: 2,
  style: 'currency',
});

const compactCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  compactDisplay: 'short',
  currency: 'USD',
  maximumFractionDigits: 2,
  notation: 'compact',
  style: 'currency',
});

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  signDisplay: 'exceptZero',
  style: 'percent',
});

function formatPrice(value: number) {
  if (value > 0 && value < 1) {
    return new Intl.NumberFormat('pt-BR', {
      currency: 'USD',
      maximumFractionDigits: 6,
      style: 'currency',
    }).format(value);
  }

  return currencyFormatter.format(value);
}

function formatCompactCurrency(value: number) {
  return compactCurrencyFormatter.format(value);
}

function formatPercent(value: number) {
  return percentFormatter.format(value / 100);
}

function getTone(value: number): RowTone {
  return value >= 0 ? 'positive' : 'negative';
}

function getFallbackTrendPath(value: number) {
  const direction = value >= 0 ? 1 : -1;
  const intensity = Math.min(Math.abs(value), 20);
  const startY = direction > 0 ? 28 : 12;
  const middleY = 20 - direction * (intensity / 3);
  const endY = direction > 0 ? 12 : 28;

  return `M4 ${startY} C24 ${middleY} 52 ${middleY} 76 ${endY}`;
}

function getSparklinePath(prices: number[], fallbackValue: number) {
  const validPrices = prices.filter((price) => Number.isFinite(price));

  if (validPrices.length < 2) {
    return getFallbackTrendPath(fallbackValue);
  }

  const minPrice = Math.min(...validPrices);
  const maxPrice = Math.max(...validPrices);
  const priceRange = maxPrice - minPrice || 1;
  const stepX = 72 / (validPrices.length - 1);

  return validPrices
    .map((price, index) => {
      const x = 4 + index * stepX;
      const y = 34 - ((price - minPrice) / priceRange) * 28;
      const command = index === 0 ? 'M' : 'L';

      return `${command}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function renderSkeletonRows(activeTableKey: MarketTableKey) {
  return [1, 2, 3, 4, 5].map((rank) => (
    <TableRow
      className={styles.tableRow}
      key={`${activeTableKey}-loading-${rank}`}
    >
      <TableCell className={styles.rankCell}>{rank}</TableCell>
      <TableCell>
        <div className={styles.coinCell}>
          <div className={styles.coinIconSkeleton} />
          <div>
            <div className={styles.coinNameSkeleton} />
            <div className={styles.coinSymbolSkeleton} />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className={styles.priceSkeleton} />
      </TableCell>
      <TableCell>
        <div className={styles.changeSkeleton} />
      </TableCell>
      <TableCell>
        <div className={styles.marketCapSkeleton} />
      </TableCell>
      <TableCell>
        <div className={styles.chartSkeleton} />
      </TableCell>
    </TableRow>
  ));
}

export function CryptoMarketTabs() {
  const [activeTableKey, setActiveTableKey] = useState<MarketTableKey>('top');
  const [searchTerm, setSearchTerm] = useState('');
  const requestedMarkets = useRef(new Set<MarketTableKey>());
  const [searchMarket, setSearchMarket] = useState<MarketState>(
    createInitialMarketState(),
  );
  const [markets, setMarkets] = useState<Record<MarketTableKey, MarketState>>({
    top: createInitialMarketState(),
    trending: createInitialMarketState(),
  });

  const normalizedSearchTerm = searchTerm.trim();
  const isSearching = normalizedSearchTerm.length > 0;
  const activeMarket = isSearching ? searchMarket : markets[activeTableKey];
  const activeTable = useMemo(
    () =>
      marketTables.find((table) => table.key === activeTableKey) ??
      marketTables[0],
    [activeTableKey],
  );

  useEffect(() => {
    if (requestedMarkets.current.has(activeTableKey)) {
      return;
    }

    requestedMarkets.current.add(activeTableKey);

    async function loadMarket() {
      setMarkets((currentMarkets) => ({
        ...currentMarkets,
        [activeTableKey]: {
          ...currentMarkets[activeTableKey],
          error: null,
          isLoading: true,
        },
      }));

      try {
        const response = await fetch(`/api/crypto/market?type=${activeTableKey}`, {
          cache: 'no-store',
        });
        const result = (await response.json()) as CryptoMarketResponse;

        if (!response.ok) {
          throw new Error(
            result.message ?? 'Nao foi possivel carregar a tabela.',
          );
        }

        setMarkets((currentMarkets) => ({
          ...currentMarkets,
          [activeTableKey]: {
            data: result.data ?? [],
            error: null,
            isLoading: false,
            updatedAt: result.updatedAt ?? new Date().toISOString(),
          },
        }));
      } catch (error) {
        setMarkets((currentMarkets) => ({
          ...currentMarkets,
          [activeTableKey]: {
            ...currentMarkets[activeTableKey],
            error:
              error instanceof Error
                ? error.message
                : 'Nao foi possivel carregar a tabela.',
            isLoading: false,
          },
        }));
      }
    }

    loadMarket();
  }, [activeTableKey]);

  useEffect(() => {
    if (!normalizedSearchTerm) {
      setSearchMarket(createInitialMarketState());
      return;
    }

    const controller = new AbortController();
    const searchUrl = `/api/crypto/market?search=${encodeURIComponent(
      normalizedSearchTerm,
    )}`;

    setSearchMarket((currentSearchMarket) => ({
      ...currentSearchMarket,
      error: null,
      isLoading: true,
    }));

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(searchUrl, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const result = (await response.json()) as CryptoMarketResponse;

        if (!response.ok) {
          throw new Error(
            result.message ?? 'Nao foi possivel pesquisar criptomoedas.',
          );
        }

        setSearchMarket({
          data: result.data ?? [],
          error: null,
          isLoading: false,
          updatedAt: result.updatedAt ?? new Date().toISOString(),
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setSearchMarket((currentSearchMarket) => ({
          ...currentSearchMarket,
          error:
            error instanceof Error
              ? error.message
              : 'Nao foi possivel pesquisar criptomoedas.',
          isLoading: false,
        }));
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [normalizedSearchTerm]);

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

        <form
          className={styles.searchForm}
          onSubmit={(event) => event.preventDefault()}
          role="search"
        >
          <input
            aria-label="Buscar criptomoeda"
            className={styles.searchInput}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por Bitcoin ou BTC"
            type="search"
            value={searchTerm}
          />
        </form>
      </div>

      {activeMarket.error ? (
        <div className={styles.feedbackBox}>{activeMarket.error}</div>
      ) : null}

      <Table className={styles.table}>
        <TableHeader className={styles.tableHead}>
          <TableRow className={styles.headerRow}>
            <TableHead className={styles.rankHeader}>#</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Preco</TableHead>
            <TableHead>24h</TableHead>
            <TableHead>Market cap</TableHead>
            <TableHead>Ultimos 7 dias</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeMarket.isLoading
            ? renderSkeletonRows(activeTable.key)
            : activeMarket.data.map((crypto) => {
                const change24hTone = getTone(crypto.percentChange24h);
                const change7dTone = getTone(crypto.percentChange7d);

                return (
                  <TableRow className={styles.tableRow} key={crypto.id}>
                    <TableCell className={styles.rankCell}>
                      {crypto.rank || '-'}
                    </TableCell>
                    <TableCell>
                      <div className={styles.coinCell}>
                        {crypto.logoUrl ? (
                          <Image
                            alt=""
                            className={styles.coinLogo}
                            height={36}
                            src={crypto.logoUrl}
                            width={36}
                          />
                        ) : (
                          <div className={styles.coinFallback}>
                            {crypto.symbol.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className={styles.coinName}>{crypto.name}</p>
                          <p className={styles.coinSymbol}>{crypto.symbol}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={styles.valueCell}>
                      {formatPrice(crypto.priceUsd)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`${styles.percentBadge} ${
                          change24hTone === 'positive'
                            ? styles.positiveText
                            : styles.negativeText
                        }`}
                      >
                        {formatPercent(crypto.percentChange24h)}
                      </span>
                    </TableCell>
                    <TableCell className={styles.valueCell}>
                      {formatCompactCurrency(crypto.marketCapUsd)}
                    </TableCell>
                    <TableCell>
                      <div className={styles.trendCell}>
                        <svg
                          aria-hidden="true"
                          className={`${styles.sparkline} ${
                            change7dTone === 'positive'
                              ? styles.positiveStroke
                              : styles.negativeStroke
                          }`}
                          viewBox="0 0 80 40"
                        >
                          <path
                            d={getSparklinePath(
                              crypto.sparklinePrices,
                              crypto.percentChange7d,
                            )}
                          />
                        </svg>
                        <span
                          className={
                            change7dTone === 'positive'
                              ? styles.positiveText
                              : styles.negativeText
                          }
                        >
                          {formatPercent(crypto.percentChange7d)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
        </TableBody>
      </Table>

      {!activeMarket.isLoading &&
      !activeMarket.error &&
      activeMarket.data.length === 0 ? (
        <div className={styles.feedbackBox}>
          {isSearching
            ? 'Nenhuma criptomoeda encontrada para esta busca.'
            : 'Nenhuma criptomoeda encontrada para esta tabela.'}
        </div>
      ) : null}
    </section>
  );
}
