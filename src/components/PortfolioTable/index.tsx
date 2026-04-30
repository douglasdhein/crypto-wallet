'use client';

import { EllipsisVertical, Plus } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { buttonVariants } from '@/components/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/Table';
import styles from './style.module.css';

type PortfolioTabKey = 'coins' | 'analytics';
type RowTone = 'positive' | 'negative';

type PortfolioTab = {
  key: PortfolioTabKey;
  label: string;
};

type PortfolioAllocation = {
  coin: PortfolioCoin;
  color: string;
  percent: number;
  segmentLength: number;
  segmentOffset: number;
  valueUsd: number;
};

export type PortfolioCoin = {
  id: string;
  name: string;
  symbol: string;
  logoUrl: string | null;
  priceUsd: number;
  percentChange24h: number;
  percentChange7d: number;
  sparklinePrices: number[];
  costBasisUsd?: number;
  holdings?: number;
};

type PortfolioTableProps = {
  coins: PortfolioCoin[];
  isLoading?: boolean;
  onAddCoinsClick: () => void;
  onAddTransactionClick: (coin: PortfolioCoin) => void;
  onDeleteCoinClick: (coin: PortfolioCoin) => void;
  onViewTransactionsClick: (coin: PortfolioCoin) => void;
};

type OptionsMenuPosition = {
  left: number;
  top: number;
};

const portfolioTabs: PortfolioTab[] = [
  {
    key: 'coins',
    label: 'Moedas',
  },
  {
    key: 'analytics',
    label: 'Dados Analíticos',
  },
];

const chartColors = [
  '#34d399',
  '#60a5fa',
  '#f59e0b',
  '#f472b6',
  '#a78bfa',
  '#22d3ee',
  '#fb7185',
  '#84cc16',
];
const chartRadius = 62;
const chartCircumference = 2 * Math.PI * chartRadius;

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  currency: 'USD',
  maximumFractionDigits: 2,
  style: 'currency',
});

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  signDisplay: 'exceptZero',
  style: 'percent',
});

const holdingsFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 8,
});

const allocationFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
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

function getPortfolioAllocations(coins: PortfolioCoin[]) {
  const portfolioValues = coins
    .map((coin) => {
      const holdings = coin.holdings ?? 0;

      return {
        coin,
        valueUsd: holdings * coin.priceUsd,
      };
    })
    .filter((allocation) => allocation.valueUsd > 0)
    .sort(
      (currentAllocation, nextAllocation) =>
        nextAllocation.valueUsd - currentAllocation.valueUsd,
    );
  const totalValueUsd = portfolioValues.reduce(
    (total, allocation) => total + allocation.valueUsd,
    0,
  );

  if (totalValueUsd <= 0) {
    return [];
  }

  let accumulatedLength = 0;
  const segmentGap = portfolioValues.length > 1 ? 3 : 0;

  return portfolioValues.map<PortfolioAllocation>((allocation, index) => {
    const rawSegmentLength =
      (allocation.valueUsd / totalValueUsd) * chartCircumference;
    const portfolioAllocation = {
      coin: allocation.coin,
      color: chartColors[index % chartColors.length],
      percent: (allocation.valueUsd / totalValueUsd) * 100,
      segmentLength: Math.max(rawSegmentLength - segmentGap, 0),
      segmentOffset: -accumulatedLength,
      valueUsd: allocation.valueUsd,
    };

    accumulatedLength += rawSegmentLength;

    return portfolioAllocation;
  });
}

export function PortfolioTable({
  coins,
  isLoading = false,
  onAddCoinsClick,
  onAddTransactionClick,
  onDeleteCoinClick,
  onViewTransactionsClick,
}: PortfolioTableProps) {
  const [activeTabKey, setActiveTabKey] = useState<PortfolioTabKey>('coins');
  const [searchTerm, setSearchTerm] = useState('');
  const [openOptionsCoinId, setOpenOptionsCoinId] = useState<string | null>(
    null,
  );
  const [optionsMenuPosition, setOptionsMenuPosition] =
    useState<OptionsMenuPosition | null>(null);
  const optionsMenuRef = useRef<HTMLDivElement | null>(null);
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredCoins = normalizedSearchTerm
    ? coins.filter((coin) => {
        const normalizedName = coin.name.toLowerCase();
        const normalizedSymbol = coin.symbol.toLowerCase();

        return (
          normalizedName.includes(normalizedSearchTerm) ||
          normalizedSymbol.includes(normalizedSearchTerm)
        );
      })
    : coins;
  const visibleCoins = activeTabKey === 'coins' ? filteredCoins : [];
  const openOptionsCoin =
    coins.find((coin) => coin.id === openOptionsCoinId) ?? null;
  const portfolioAllocations = getPortfolioAllocations(coins);
  const totalPortfolioValueUsd = portfolioAllocations.reduce(
    (total, allocation) => total + allocation.valueUsd,
    0,
  );
  const hasPortfolioAllocations = portfolioAllocations.length > 0;

  const emptyMessage = normalizedSearchTerm
    ? 'Nenhuma moeda encontrada no seu portfólio.'
    : 'Nenhuma moeda adicionada ao portfólio.';

  useEffect(() => {
    if (!openOptionsCoinId) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (optionsMenuRef.current?.contains(target)) {
        return;
      }

      setOpenOptionsCoinId(null);
      setOptionsMenuPosition(null);
    }

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [openOptionsCoinId]);

  function handleOpenOptions(
    event: MouseEvent<HTMLButtonElement>,
    coinId: string,
  ) {
    const buttonRect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 160;
    const horizontalGap = 8;
    const viewportPadding = 16;
    const preferredLeft = buttonRect.right + horizontalGap;
    const left = Math.min(
      preferredLeft,
      window.innerWidth - menuWidth - viewportPadding,
    );

    setOpenOptionsCoinId(coinId);
    setOptionsMenuPosition({
      left,
      top: buttonRect.top + buttonRect.height / 2,
    });
  }

  function handleTabChange(tabKey: PortfolioTabKey) {
    setActiveTabKey(tabKey);
    setOpenOptionsCoinId(null);
    setOptionsMenuPosition(null);
  }

  function handleDeleteOptionClick(coin: PortfolioCoin) {
    setOpenOptionsCoinId(null);
    setOptionsMenuPosition(null);
    onDeleteCoinClick(coin);
  }

  function handleViewTransactionsOptionClick(coin: PortfolioCoin) {
    setOpenOptionsCoinId(null);
    setOptionsMenuPosition(null);
    onViewTransactionsClick(coin);
  }

  return (
    <section className={styles.wrapper} id="portfolio-table">
      <div className={styles.header}>
        <div className={styles.tabs}>
          {portfolioTabs.map((tab) => {
            const isActive = tab.key === activeTabKey;

            return (
              <button
                aria-pressed={isActive}
                className={`${styles.tabButton} ${
                  isActive ? styles.tabButtonActive : styles.tabButtonInactive
                }`}
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                type="button"
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.tableActions}>
          {activeTabKey === 'coins' ? (
            <form
              className={styles.searchForm}
              onSubmit={(event) => event.preventDefault()}
              role="search"
            >
              <input
                aria-label="Buscar moeda no portfólio"
                className={styles.searchInput}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Pesquisar"
                type="search"
                value={searchTerm}
              />
            </form>
          ) : null}

          <button
            className={buttonVariants({ className: styles.addButton })}
            onClick={onAddCoinsClick}
            type="button"
          >
            Adicionar Moeda
          </button>
        </div>
      </div>

      {activeTabKey === 'coins' ? (
        <Table className={styles.table}>
          <TableHeader className={styles.tableHead}>
            <TableRow className={styles.headerRow}>
              <TableHead className={styles.coinHeader}>Nome</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>24h</TableHead>
              <TableHead>Últimos 7 dias</TableHead>
              <TableHead>Ativos</TableHead>
              <TableHead className={styles.actionsHeader}>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className={styles.tableRow}>
                <TableCell className={styles.emptyCell} colSpan={6}>
                  Carregando moedas do portfólio
                </TableCell>
              </TableRow>
            ) : visibleCoins.length > 0 ? (
              visibleCoins.map((coin) => {
                const change24hTone = getTone(coin.percentChange24h);
                const change7dTone = getTone(coin.percentChange7d);

                return (
                  <TableRow className={styles.tableRow} key={coin.id}>
                    <TableCell className={styles.coinTableCell}>
                      <div className={styles.coinCell}>
                        {coin.logoUrl ? (
                          <Image
                            alt=""
                            className={styles.coinLogo}
                            height={36}
                            src={coin.logoUrl}
                            width={36}
                          />
                        ) : (
                          <div className={styles.coinFallback}>
                            {coin.symbol.charAt(0)}
                          </div>
                        )}
                        <div className={styles.coinText}>
                          <p className={styles.coinName}>{coin.name}</p>
                          <p className={styles.coinSymbol}>{coin.symbol}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={styles.valueCell}>
                      {formatPrice(coin.priceUsd)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`${styles.percentBadge} ${
                          change24hTone === 'positive'
                            ? styles.positiveText
                            : styles.negativeText
                        }`}
                      >
                        {formatPercent(coin.percentChange24h)}
                      </span>
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
                              coin.sparklinePrices,
                              coin.percentChange7d,
                            )}
                          />
                        </svg>
                      </div>
                    </TableCell>
                    <TableCell className={styles.valueCell}>
                      {coin.holdings && coin.holdings > 0
                        ? `${holdingsFormatter.format(coin.holdings)} ${
                            coin.symbol
                          }`
                        : '-'}
                    </TableCell>
                    <TableCell className={styles.actionsCell}>
                      <div
                        className={styles.actionButtons}
                        ref={
                          openOptionsCoinId === coin.id ? optionsMenuRef : null
                        }
                      >
                        <button
                          aria-label={`Adicionar transação de ${coin.name}`}
                          className={styles.iconButton}
                          onClick={() => onAddTransactionClick(coin)}
                          title={`Adicionar Transação`}
                          type="button"
                        >
                          <Plus
                            aria-hidden="true"
                            className={styles.actionIcon}
                          />
                        </button>

                        <button
                          aria-label={`Abrir opções de ${coin.name}`}
                          aria-expanded={openOptionsCoinId === coin.id}
                          className={styles.iconButton}
                          onClick={(event) => handleOpenOptions(event, coin.id)}
                          title={`Opções`}
                          type="button"
                        >
                          <EllipsisVertical
                            aria-hidden="true"
                            className={styles.actionIcon}
                          />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow className={styles.tableRow}>
                <TableCell className={styles.emptyCell} colSpan={6}>
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      ) : (
        <div className={styles.analyticsPanel}>
          {isLoading ? (
            <div className={styles.analyticsEmpty}>
              Carregando dados do portfolio...
            </div>
          ) : hasPortfolioAllocations ? (
            <div className={styles.analyticsGrid}>
              <div className={styles.chartArea}>
                <div className={styles.chartWrap}>
                  <svg
                    aria-label="Distribuição do portfólio"
                    className={styles.pieChart}
                    role="img"
                    viewBox="0 0 180 180"
                  >
                    <circle
                      className={styles.chartTrack}
                      cx="90"
                      cy="90"
                      r={chartRadius}
                    />

                    {portfolioAllocations.map((allocation) => (
                      <circle
                        className={styles.chartSegment}
                        cx="90"
                        cy="90"
                        key={allocation.coin.id}
                        r={chartRadius}
                        stroke={allocation.color}
                        strokeDasharray={`${allocation.segmentLength} ${chartCircumference}`}
                        strokeDashoffset={allocation.segmentOffset}
                      />
                    ))}
                  </svg>

                  <div className={styles.chartCenter}>
                    <span className={styles.chartLabel}>Valor total</span>
                    <strong className={styles.chartValue}>
                      {currencyFormatter.format(totalPortfolioValueUsd)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className={styles.allocationContent}>
                <div className={styles.analyticsHeading}>
                  <h3>Distribuição do portfólio</h3>
                  <p>Moedas com saldo positivo na carteira.</p>
                </div>

                <ul className={styles.allocationList}>
                  {portfolioAllocations.map((allocation) => (
                    <li
                      className={styles.allocationItem}
                      key={allocation.coin.id}
                    >
                      <span
                        aria-hidden="true"
                        className={styles.allocationSwatch}
                        style={{ backgroundColor: allocation.color }}
                      />

                      <div className={styles.allocationCoin}>
                        {allocation.coin.logoUrl ? (
                          <Image
                            alt=""
                            className={styles.allocationLogo}
                            height={32}
                            src={allocation.coin.logoUrl}
                            width={32}
                          />
                        ) : (
                          <span className={styles.allocationFallback}>
                            {allocation.coin.symbol.charAt(0)}
                          </span>
                        )}

                        <div className={styles.allocationText}>
                          <p className={styles.allocationName}>
                            {allocation.coin.name}
                          </p>
                          <p className={styles.allocationSymbol}>
                            {holdingsFormatter.format(
                              allocation.coin.holdings ?? 0,
                            )}{' '}
                            {allocation.coin.symbol}
                          </p>
                        </div>
                      </div>

                      <div className={styles.allocationNumbers}>
                        <strong>
                          {allocationFormatter.format(allocation.percent)}%
                        </strong>
                        <span>
                          {currencyFormatter.format(allocation.valueUsd)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className={styles.analyticsEmpty}>
              <p>Nenhuma moeda para exibir.</p>
              <span>
                Adicione uma transação para gerar a distribuição do portfólio.
              </span>
            </div>
          )}
        </div>
      )}

      {openOptionsCoin && optionsMenuPosition ? (
        <div
          className={styles.optionsMenu}
          ref={optionsMenuRef}
          style={{
            left: optionsMenuPosition.left,
            top: optionsMenuPosition.top,
          }}
        >
          <button
            className={styles.optionButton}
            onClick={() => handleViewTransactionsOptionClick(openOptionsCoin)}
            type="button"
          >
            Ver transações
          </button>

          <button
            className={styles.optionButton}
            onClick={() => handleDeleteOptionClick(openOptionsCoin)}
            type="button"
          >
            Excluir moeda
          </button>
        </div>
      ) : null}
    </section>
  );
}
