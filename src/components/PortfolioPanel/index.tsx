'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { buttonVariants } from '@/components/Button';
import { PortfolioCoinModal } from '@/components/PortfolioCoinModal';
import { PortfolioSummaryCards } from '@/components/PortfolioSummaryCards';
import type { PortfolioCoin } from '@/components/PortfolioTable';
import { PortfolioTable } from '@/components/PortfolioTable';
import { PortfolioTransactionModal } from '@/components/PortfolioTransactionModal';
import { PortfolioTransactionsTable } from '@/components/PortfolioTransactionsTable';
import styles from './style.module.css';

type PortfolioPanelProps = {
  isAuthenticated: boolean;
};

type PortfolioCoinsResponse = {
  coin?: PortfolioCoin | null;
  data?: PortfolioCoin[];
  message?: string;
};

type PortfolioActionResult = {
  ok: boolean;
  message?: string;
};

type PortfolioTransactionPayload = {
  coinId: string;
  executedAt: string;
} & (
  | {
      totalAmountUsd: number;
      type: 'buy';
    }
  | {
      quantity: number;
      type: 'sell';
    }
);

type PortfolioTransactionResponse = {
  coinId?: string;
  holdings?: number;
  message?: string;
};

export function PortfolioPanel({ isAuthenticated }: PortfolioPanelProps) {
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);
  const [transactionCoinId, setTransactionCoinId] = useState<string | null>(
    null,
  );
  const [transactionsCoin, setTransactionsCoin] =
    useState<PortfolioCoin | null>(null);
  const [coinPendingDeletion, setCoinPendingDeletion] =
    useState<PortfolioCoin | null>(null);
  const [coins, setCoins] = useState<PortfolioCoin[]>([]);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [isDeletingCoin, setIsDeletingCoin] = useState(false);
  const [isLoadingCoins, setIsLoadingCoins] = useState(false);
  const addedCoinIds = coins.map((coin) => coin.id);
  const hasCoins = coins.length > 0;
  const shouldShowLoadingPanel = isAuthenticated && isLoadingCoins && !hasCoins;
  const shouldShowEmptyPortfolioPanel =
    isAuthenticated && !isLoadingCoins && !hasCoins;

  const loadPortfolioCoins = useCallback(
    async ({
      showLoading = true,
      signal,
    }: {
      showLoading?: boolean;
      signal?: AbortSignal;
    } = {}) => {
      if (!isAuthenticated) {
        return;
      }

      setPortfolioError(null);

      if (showLoading) {
        setIsLoadingCoins(true);
      }

      try {
        const response = await fetch('/api/portfolio/coins', {
          cache: 'no-store',
          signal,
        });
        const result = (await response.json()) as PortfolioCoinsResponse;

        if (!response.ok) {
          throw new Error(
            result.message ?? 'Nao foi possivel carregar seu portfolio.',
          );
        }

        const nextCoins = result.data ?? [];

        setCoins(nextCoins);
        setTransactionsCoin((currentCoin) => {
          if (!currentCoin) {
            return currentCoin;
          }

          return (
            nextCoins.find((nextCoin) => nextCoin.id === currentCoin.id) ??
            currentCoin
          );
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setPortfolioError(
          error instanceof Error
            ? error.message
            : 'Nao foi possivel carregar seu portfolio.',
        );
      } finally {
        if (showLoading) {
          setIsLoadingCoins(false);
        }
      }
    },
    [isAuthenticated],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const controller = new AbortController();

    async function loadInitialPortfolioCoins() {
      await loadPortfolioCoins({
        signal: controller.signal,
      });
    }

    loadInitialPortfolioCoins();

    return () => {
      controller.abort();
    };
  }, [isAuthenticated, loadPortfolioCoins]);

  async function handleAddCoin(
    coin: PortfolioCoin,
  ): Promise<PortfolioActionResult> {
    setPortfolioError(null);

    try {
      const response = await fetch('/api/portfolio/coins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(coin),
      });
      const result = (await response.json()) as PortfolioCoinsResponse;

      if (!response.ok) {
        return {
          ok: false,
          message: result.message ?? 'Nao foi possivel adicionar a moeda.',
        };
      }

      if (result.coin) {
        setCoins((currentCoins) => {
          const coinAlreadyAdded = currentCoins.some(
            (currentCoin) => currentCoin.id === result.coin?.id,
          );

          if (coinAlreadyAdded) {
            return currentCoins;
          }

          return [...currentCoins, result.coin as PortfolioCoin];
        });
      }

      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        message: 'Nao foi possivel conectar ao servidor.',
      };
    }
  }

  async function handleDeleteCoin(
    coinId: string,
  ): Promise<PortfolioActionResult> {
    setPortfolioError(null);

    try {
      const response = await fetch("/api/portfolio/coins", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: coinId,
        }),
      });
      const result = (await response.json()) as PortfolioCoinsResponse;

      if (!response.ok) {
        return {
          ok: false,
          message: result.message ?? "Nao foi possivel excluir a moeda.",
        };
      }

      setCoins((currentCoins) =>
        currentCoins.filter((currentCoin) => currentCoin.id !== coinId),
      );
      setTransactionsCoin((currentCoin) =>
        currentCoin?.id === coinId ? null : currentCoin,
      );

      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        message: "Nao foi possivel conectar ao servidor.",
      };
    }
  }

  async function handleAddTransaction(
    transaction: PortfolioTransactionPayload,
  ): Promise<PortfolioActionResult> {
    setPortfolioError(null);

    try {
      const response = await fetch('/api/portfolio/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });
      const result = (await response.json()) as PortfolioTransactionResponse;

      if (!response.ok || !result.coinId || typeof result.holdings !== 'number') {
        return {
          ok: false,
          message: result.message ?? 'Nao foi possivel adicionar a transacao.',
        };
      }

      const updatedCoinId = result.coinId;
      const updatedHoldings = result.holdings;

      setCoins((currentCoins) =>
        currentCoins.map((coin) =>
          coin.id === updatedCoinId
            ? {
                ...coin,
                holdings: updatedHoldings,
              }
            : coin,
        ),
      );
      setTransactionsCoin((currentCoin) =>
        currentCoin?.id === updatedCoinId
          ? {
              ...currentCoin,
              holdings: updatedHoldings,
            }
          : currentCoin,
      );
      void loadPortfolioCoins({
        showLoading: false,
      });

      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        message: 'Nao foi possivel conectar ao servidor.',
      };
    }
  }

  function handleOpenCoinModal() {
    setPortfolioError(null);
    setIsCoinModalOpen(true);
  }

  function handleCloseCoinModal() {
    setIsCoinModalOpen(false);
  }

  function handleOpenTransactionModal(coin: PortfolioCoin) {
    setPortfolioError(null);
    setTransactionCoinId(coin.id);
  }

  function handleCloseTransactionModal() {
    setTransactionCoinId(null);
  }

  function handleOpenTransactionsTable(coin: PortfolioCoin) {
    setPortfolioError(null);
    setTransactionsCoin(coin);
  }

  function handleCloseTransactionsTable() {
    setTransactionsCoin(null);
  }

  function handlePortfolioHoldingsChange(coinId: string, holdings: number) {
    setCoins((currentCoins) =>
      currentCoins.map((coin) =>
        coin.id === coinId
          ? {
              ...coin,
              holdings,
            }
          : coin,
      ),
    );
    setTransactionsCoin((currentCoin) =>
      currentCoin?.id === coinId
        ? {
            ...currentCoin,
            holdings,
          }
        : currentCoin,
    );
    void loadPortfolioCoins({
      showLoading: false,
    });
  }

  function handleOpenDeleteAlert(coin: PortfolioCoin) {
    setDeleteFeedback(null);
    setCoinPendingDeletion(coin);
  }

  function handleCloseDeleteAlert() {
    if (isDeletingCoin) {
      return;
    }

    setDeleteFeedback(null);
    setCoinPendingDeletion(null);
  }

  async function handleConfirmDeleteCoin() {
    if (!coinPendingDeletion) {
      return;
    }

    setDeleteFeedback(null);
    setIsDeletingCoin(true);

    try {
      const result = await handleDeleteCoin(coinPendingDeletion.id);

      if (!result.ok) {
        setDeleteFeedback(
          result.message ?? "Nao foi possivel excluir a moeda.",
        );
        return;
      }

      setCoinPendingDeletion(null);
    } finally {
      setIsDeletingCoin(false);
    }
  }

  return (
    <>
      {!isAuthenticated ? (
        <section className={styles.panel}>
          <div className={styles.content}>
            <h1 className={styles.title}>Portfólio de Criptomoedas</h1>
            <p className={styles.description}>
              Acompanhe seus lucros, perdas e a valoriza&ccedil;&atilde;o do seu
              portfólio com nossa plataforma f&aacute;cil de usar.
            </p>
            <Link
              className={buttonVariants({ className: styles.ctaButton })}
              href="/register"
            >
              Criar seu portfólio
            </Link>
          </div>
        </section>
      ) : null}

      {shouldShowLoadingPanel ? (
        <section className={styles.panel}>
          <div className={styles.content}>
            <p className={styles.loadingText}>
              Carregando seu portf&oacute;lio...
            </p>
          </div>
        </section>
      ) : null}

      {shouldShowEmptyPortfolioPanel ? (
        <section className={styles.panel}>
          <div className={styles.content}>
            <h1 className={styles.title}>
              Vamos come&ccedil;ar com seu primeiro portf&oacute;lio!
            </h1>
            <p className={styles.description}>
              Acompanhe lucros, perdas e valoriza&ccedil;&atilde;o, tudo em um
              s&oacute; lugar.
            </p>
            <button
              className={buttonVariants({ className: styles.ctaButton })}
              onClick={handleOpenCoinModal}
              type="button"
            >
              Criar seu portf&oacute;lio
            </button>
          </div>
        </section>
      ) : null}

      {isAuthenticated ? (
        <>
          {portfolioError ? (
            <p className={styles.feedback}>{portfolioError}</p>
          ) : null}

          {hasCoins && transactionsCoin ? (
            <PortfolioTransactionsTable
              coin={transactionsCoin}
              onBack={handleCloseTransactionsTable}
              onHoldingsChange={handlePortfolioHoldingsChange}
            />
          ) : null}

          {hasCoins && !transactionsCoin ? (
            <>
              <PortfolioSummaryCards coins={coins} />
              <PortfolioTable
                coins={coins}
                onAddCoinsClick={handleOpenCoinModal}
                onAddTransactionClick={handleOpenTransactionModal}
                onDeleteCoinClick={handleOpenDeleteAlert}
                onViewTransactionsClick={handleOpenTransactionsTable}
              />
            </>
          ) : null}
          <PortfolioCoinModal
            addedCoinIds={addedCoinIds}
            isOpen={isCoinModalOpen}
            onAddCoin={handleAddCoin}
            onClose={handleCloseCoinModal}
          />
          {transactionCoinId ? (
            <PortfolioTransactionModal
              coins={coins}
              initialCoinId={transactionCoinId}
              isOpen
              onAddTransaction={handleAddTransaction}
              onClose={handleCloseTransactionModal}
            />
          ) : null}

          {coinPendingDeletion ? (
            <div className={styles.modalOverlay}>
              <div
                aria-labelledby="delete-portfolio-coin-title"
                aria-modal="true"
                className={styles.deleteAlert}
                role="alertdialog"
              >
                <p
                  className={styles.deleteAlertText}
                  id="delete-portfolio-coin-title"
                >
                  Voc&ecirc; tem certeza de que deseja excluir{" "}
                  {coinPendingDeletion.name} do portf&oacute;lio?
                </p>

                {deleteFeedback ? (
                  <p className={styles.deleteFeedback}>{deleteFeedback}</p>
                ) : null}

                <div className={styles.deleteAlertActions}>
                  <button
                    className={styles.dangerButton}
                    disabled={isDeletingCoin}
                    onClick={handleConfirmDeleteCoin}
                    type="button"
                  >
                    {isDeletingCoin ? "Excluindo..." : "Confirmar"}
                  </button>

                  <button
                    className={styles.secondaryButton}
                    disabled={isDeletingCoin}
                    onClick={handleCloseDeleteAlert}
                    type="button"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
