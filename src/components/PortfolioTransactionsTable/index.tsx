'use client';

import { ArrowLeft, Pencil, Trash } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { PortfolioCoin } from '@/components/PortfolioTable';
import { PortfolioTransactionEditModal } from '@/components/PortfolioTransactionEditModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/Table';
import styles from './style.module.css';

type PortfolioTransactionType = 'buy' | 'sell';

type PortfolioTransaction = {
  id: string;
  executedAt: string;
  historicalPriceUsd: number;
  quantity: number;
  totalAmountUsd: number;
  type: PortfolioTransactionType;
};

type PortfolioTransactionsResponse = {
  data?: PortfolioTransaction[];
  holdings?: number;
  message?: string;
  transaction?: PortfolioTransaction;
};

type PortfolioTransactionPayload = {
  coinId: string;
  executedAt: string;
  id: string;
} & (
  | {
      totalAmountUsd: number;
      type: 'buy';
    }
  | {
      totalAmountUsd: number;
      type: 'sell';
    }
);

type PortfolioDeleteTransactionResponse = {
  coinId?: string;
  holdings?: number;
  message?: string;
};

type PortfolioTransactionsTableProps = {
  coin: PortfolioCoin;
  onBack: () => void;
  onHoldingsChange: (coinId: string, holdings: number) => void;
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  currency: 'USD',
  maximumFractionDigits: 2,
  style: 'currency',
});

const quantityFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 8,
});

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function formatTransactionType(type: PortfolioTransactionType) {
  return type === 'buy' ? 'Compra' : 'Venda';
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return dateTimeFormatter.format(date);
}

function formatTransactionCurrency(value: number) {
  if (value <= 0) {
    return '-';
  }

  return currencyFormatter.format(value);
}

export function PortfolioTransactionsTable({
  coin,
  onBack,
  onHoldingsChange,
}: PortfolioTransactionsTableProps) {
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>([]);
  const [editingTransaction, setEditingTransaction] =
    useState<PortfolioTransaction | null>(null);
  const [transactionPendingDeletion, setTransactionPendingDeletion] =
    useState<PortfolioTransaction | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);
  const [isDeletingTransaction, setIsDeletingTransaction] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTransactions() {
      setFeedbackMessage(null);
      setIsLoadingTransactions(true);

      try {
        const response = await fetch(
          `/api/portfolio/transactions?coinId=${encodeURIComponent(coin.id)}`,
          {
            cache: 'no-store',
            signal: controller.signal,
          },
        );
        const result = (await response.json()) as PortfolioTransactionsResponse;

        if (!response.ok) {
          throw new Error(
            result.message ?? 'Não foi possível carregar as transações.',
          );
        }

        setTransactions(result.data ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setTransactions([]);
        setFeedbackMessage(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar as transações.',
        );
      } finally {
        setIsLoadingTransactions(false);
      }
    }

    loadTransactions();

    return () => {
      controller.abort();
    };
  }, [coin.id]);

  async function handleEditTransaction(
    transaction: PortfolioTransactionPayload,
  ) {
    setFeedbackMessage(null);

    try {
      const response = await fetch('/api/portfolio/transactions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });
      const result = (await response.json()) as PortfolioTransactionsResponse;

      if (
        !response.ok ||
        !result.transaction ||
        typeof result.holdings !== 'number'
      ) {
        return {
          ok: false,
          message: result.message ?? 'Não foi possível editar a transação.',
        };
      }

      setTransactions((currentTransactions) =>
        currentTransactions.map((currentTransaction) =>
          currentTransaction.id === result.transaction?.id
            ? result.transaction
            : currentTransaction,
        ),
      );
      onHoldingsChange(coin.id, result.holdings);

      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        message: 'Não foi possível conectar ao servidor.',
      };
    }
  }

  function handleCloseDeleteAlert() {
    if (isDeletingTransaction) {
      return;
    }

    setDeleteFeedback(null);
    setTransactionPendingDeletion(null);
  }

  async function handleConfirmDeleteTransaction() {
    if (!transactionPendingDeletion) {
      return;
    }

    setDeleteFeedback(null);
    setIsDeletingTransaction(true);

    try {
      const response = await fetch('/api/portfolio/transactions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: transactionPendingDeletion.id,
        }),
      });
      const result =
        (await response.json()) as PortfolioDeleteTransactionResponse;

      if (
        !response.ok ||
        !result.coinId ||
        typeof result.holdings !== 'number'
      ) {
        setDeleteFeedback(
          result.message ?? 'Não foi possível excluir a transação.',
        );
        return;
      }

      setTransactions((currentTransactions) =>
        currentTransactions.filter(
          (transaction) => transaction.id !== transactionPendingDeletion.id,
        ),
      );
      onHoldingsChange(result.coinId, result.holdings);
      setTransactionPendingDeletion(null);
    } catch {
      setDeleteFeedback('Não foi possível conectar ao servidor.');
    } finally {
      setIsDeletingTransaction(false);
    }
  }

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={onBack} type="button">
          <ArrowLeft aria-hidden="true" className={styles.backIcon} />
          <span>Voltar</span>
        </button>

        <div className={styles.coinHeading}>
          {coin.logoUrl ? (
            <Image
              alt=""
              className={styles.coinLogo}
              height={36}
              src={coin.logoUrl}
              width={36}
            />
          ) : (
            <div className={styles.coinFallback}>{coin.symbol.charAt(0)}</div>
          )}

          <div className={styles.coinText}>
            <h2 className={styles.title}>
              Transa&ccedil;&otilde;es de {coin.name}
            </h2>
            <p className={styles.symbol}>{coin.symbol}</p>
          </div>
        </div>
      </div>

      {feedbackMessage ? (
        <p className={styles.feedback}>{feedbackMessage}</p>
      ) : null}

      <Table className={styles.table}>
        <TableHeader className={styles.tableHead}>
          <TableRow className={styles.headerRow}>
            <TableHead>Tipo</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Quantidade</TableHead>
            <TableHead>Data & Hora</TableHead>
            <TableHead>Custo</TableHead>
            <TableHead className={styles.actionsHeader}>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoadingTransactions ? (
            <TableRow className={styles.tableRow}>
              <TableCell className={styles.emptyCell} colSpan={6}>
                Carregando transações
              </TableCell>
            </TableRow>
          ) : transactions.length > 0 ? (
            transactions.map((transaction) => (
              <TableRow className={styles.tableRow} key={transaction.id}>
                <TableCell>
                  <span
                    className={`${styles.typeBadge} ${
                      transaction.type === 'buy'
                        ? styles.buyBadge
                        : styles.sellBadge
                    }`}
                  >
                    {formatTransactionType(transaction.type)}
                  </span>
                </TableCell>
                <TableCell className={styles.valueCell}>
                  {formatTransactionCurrency(transaction.historicalPriceUsd)}
                </TableCell>
                <TableCell className={styles.valueCell}>
                  {quantityFormatter.format(transaction.quantity)} {coin.symbol}
                </TableCell>
                <TableCell className={styles.valueCell}>
                  {formatDateTime(transaction.executedAt)}
                </TableCell>
                <TableCell className={styles.valueCell}>
                  {formatTransactionCurrency(transaction.totalAmountUsd)}
                </TableCell>
                <TableCell className={styles.actionsCell}>
                  <div className={styles.actionButtons}>
                    <button
                      aria-label={`Editar transação de ${coin.name}`}
                      className={styles.iconButton}
                      onClick={() => setEditingTransaction(transaction)}
                      title={`Editar`}
                      type="button"
                    >
                      <Pencil
                        aria-hidden="true"
                        className={styles.actionIcon}
                      />
                    </button>

                    <button
                      aria-label={`Excluir transação de ${coin.name}`}
                      className={styles.iconButton}
                      onClick={() => setTransactionPendingDeletion(transaction)}
                      title={`Excluir`}
                      type="button"
                    >
                      <Trash aria-hidden="true" className={styles.actionIcon} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow className={styles.tableRow}>
              <TableCell className={styles.emptyCell} colSpan={6}>
                Nenhuma transação encontrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {editingTransaction ? (
        <PortfolioTransactionEditModal
          coin={coin}
          onClose={() => setEditingTransaction(null)}
          onEditTransaction={handleEditTransaction}
          transaction={editingTransaction}
        />
      ) : null}

      {transactionPendingDeletion ? (
        <div className={styles.modalOverlay}>
          <div
            aria-labelledby="delete-transaction-title"
            aria-modal="true"
            className={styles.deleteAlert}
            role="alertdialog"
          >
            <p className={styles.deleteAlertText} id="delete-transaction-title">
              Você tem certeza de que deseja excluir esta transação?
            </p>

            {deleteFeedback ? (
              <p className={styles.deleteFeedback}>{deleteFeedback}</p>
            ) : null}

            <div className={styles.deleteAlertActions}>
              <button
                className={styles.dangerButton}
                disabled={isDeletingTransaction}
                onClick={handleConfirmDeleteTransaction}
                type="button"
              >
                {isDeletingTransaction ? 'Excluindo' : 'Confirmar'}
              </button>

              <button
                className={styles.secondaryButton}
                disabled={isDeletingTransaction}
                onClick={handleCloseDeleteAlert}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
