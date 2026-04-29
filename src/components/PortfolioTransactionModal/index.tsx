'use client';

import { useMemo, useState } from 'react';
import type { PortfolioCoin } from '@/components/PortfolioTable';
import styles from './style.module.css';

type TransactionType = 'buy' | 'sell';

type AddTransactionPayload = {
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

type PortfolioTransactionModalProps = {
  coins: PortfolioCoin[];
  initialCoinId: string | null;
  isOpen: boolean;
  onAddTransaction: (payload: AddTransactionPayload) => Promise<{
    ok: boolean;
    message?: string;
  }>;
  onClose: () => void;
};

const hourOptions = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, '0'),
);
const minuteOptions = Array.from({ length: 60 }, (_, minute) =>
  String(minute).padStart(2, '0'),
);

const currencyIntegerFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
});

const quantityFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 8,
});

const TRANSACTION_HISTORY_LIMIT_DAYS = 365;

function getDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getTodayDateValue() {
  return getDateInputValue(new Date());
}

function getMinimumTransactionDateValue() {
  const minimumDate = new Date();

  minimumDate.setDate(minimumDate.getDate() - TRANSACTION_HISTORY_LIMIT_DAYS);

  return getDateInputValue(minimumDate);
}

function getCurrentTimeValue() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

function formatMoneyInput(value: string) {
  const sanitizedValue = value.replace(/[^\d,]/g, '');

  if (!sanitizedValue) {
    return '';
  }

  const [integerPart = '', ...decimalParts] = sanitizedValue.split(',');
  const hasDecimalSeparator = sanitizedValue.includes(',');
  const decimalPart = decimalParts.join('').slice(0, 2);
  const normalizedIntegerPart = integerPart.replace(/^0+(?=\d)/, '');
  const formattedIntegerPart = currencyIntegerFormatter.format(
    Number(normalizedIntegerPart || '0'),
  );

  if (hasDecimalSeparator) {
    return `${formattedIntegerPart},${decimalPart}`;
  }

  return formattedIntegerPart;
}

function parseMoneyInput(value: string) {
  const normalizedValue = value.replace(/\./g, '').replace(',', '.');

  return Number(normalizedValue);
}

function parseQuantityInput(value: string) {
  return Number(value.replace(',', '.'));
}

export function PortfolioTransactionModal({
  coins,
  initialCoinId,
  isOpen,
  onAddTransaction,
  onClose,
}: PortfolioTransactionModalProps) {
  const [activeTab, setActiveTab] = useState<TransactionType>('buy');
  const [selectedCoinId, setSelectedCoinId] = useState(
    initialCoinId ?? coins[0]?.id ?? '',
  );
  const [totalAmountUsd, setTotalAmountUsd] = useState('');
  const [sellQuantity, setSellQuantity] = useState('');
  const [transactionDate, setTransactionDate] = useState(getTodayDateValue);
  const [transactionTime, setTransactionTime] = useState(getCurrentTimeValue);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [transactionHour = '00', transactionMinute = '00'] =
    transactionTime.split(':');
  const selectedCoin = useMemo(
    () => coins.find((coin) => coin.id === selectedCoinId) ?? null,
    [coins, selectedCoinId],
  );
  const selectedCoinHoldings = selectedCoin?.holdings ?? 0;
  const maximumTransactionDate = getTodayDateValue();
  const minimumTransactionDate = getMinimumTransactionDateValue();

  function handleClose() {
    if (isAddingTransaction) {
      return;
    }

    onClose();
  }

  function handleTransactionHourChange(nextHour: string) {
    setTransactionTime(`${nextHour}:${transactionMinute}`);
  }

  function handleTransactionMinuteChange(nextMinute: string) {
    setTransactionTime(`${transactionHour}:${nextMinute}`);
  }

  function handleActiveTabChange(nextTab: TransactionType) {
    setActiveTab(nextTab);
    setFeedbackMessage(null);
  }

  function handleTotalAmountChange(nextTotalAmount: string) {
    setTotalAmountUsd(formatMoneyInput(nextTotalAmount));
  }

  function handleSellQuantityChange(nextQuantity: string) {
    setSellQuantity(nextQuantity.replace(/[^\d,.]/g, ''));
  }

  async function handleAddTransaction() {
    const parsedTotalAmountUsd = parseMoneyInput(totalAmountUsd);
    const parsedSellQuantity = parseQuantityInput(sellQuantity);

    setFeedbackMessage(null);

    if (!selectedCoin) {
      setFeedbackMessage('Selecione uma moeda para adicionar a transação.');
      return;
    }

    if (
      activeTab === 'buy' &&
      (!Number.isFinite(parsedTotalAmountUsd) || parsedTotalAmountUsd <= 0)
    ) {
      setFeedbackMessage('Informe um total gasto maior que zero.');
      return;
    }

    if (
      activeTab === 'sell' &&
      (!Number.isFinite(parsedSellQuantity) || parsedSellQuantity <= 0)
    ) {
      setFeedbackMessage('Informe uma quantidade vendida maior que zero.');
      return;
    }

    if (activeTab === 'sell' && parsedSellQuantity > selectedCoinHoldings) {
      setFeedbackMessage(
        'A quantidade vendida não pode ser maior que seu saldo.',
      );
      return;
    }

    if (!transactionDate || !transactionTime) {
      setFeedbackMessage('Informe data e horário da transação.');
      return;
    }

    const executedAt = new Date(`${transactionDate}T${transactionTime}`);

    if (Number.isNaN(executedAt.getTime())) {
      setFeedbackMessage('Informe data e horário válidos.');
      return;
    }

    if (executedAt < new Date(`${minimumTransactionDate}T00:00`)) {
      setFeedbackMessage(
        'A data da transação deve estar dentro dos últimos 365 dias.',
      );
      return;
    }

    if (executedAt.getTime() > Date.now()) {
      setFeedbackMessage('A data da transação não pode ser futura.');
      return;
    }

    setIsAddingTransaction(true);

    let shouldKeepModalMounted = true;

    try {
      const transactionPayload =
        activeTab === 'buy'
          ? {
              coinId: selectedCoin.id,
              executedAt: executedAt.toISOString(),
              totalAmountUsd: parsedTotalAmountUsd,
              type: activeTab,
            }
          : {
              coinId: selectedCoin.id,
              executedAt: executedAt.toISOString(),
              quantity: parsedSellQuantity,
              type: activeTab,
            };
      const result = await onAddTransaction(transactionPayload);

      if (!result.ok) {
        setFeedbackMessage(
          result.message ?? 'Não foi possível adicionar a transação.',
        );
        return;
      }

      shouldKeepModalMounted = false;
      onClose();
    } finally {
      if (shouldKeepModalMounted) {
        setIsAddingTransaction(false);
      }
    }
  }

  return (
    <div
      aria-hidden={!isOpen}
      className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`}
    >
      <div
        aria-labelledby="portfolio-transaction-modal-title"
        aria-modal="true"
        className={styles.modal}
        role="dialog"
      >
        <h2 className={styles.title} id="portfolio-transaction-modal-title">
          Adicionar Transação
        </h2>

        <div className={styles.tabs}>
          <button
            aria-pressed={activeTab === 'buy'}
            className={`${styles.tabButton} ${
              activeTab === 'buy'
                ? styles.tabButtonActive
                : styles.tabButtonInactive
            }`}
            onClick={() => handleActiveTabChange('buy')}
            type="button"
          >
            Compra
          </button>

          <button
            aria-pressed={activeTab === 'sell'}
            className={`${styles.tabButton} ${
              activeTab === 'sell'
                ? styles.tabButtonActive
                : styles.tabButtonInactive
            }`}
            onClick={() => handleActiveTabChange('sell')}
            type="button"
          >
            Venda
          </button>
        </div>

        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Moeda</span>
            <select
              className={styles.input}
              onChange={(event) => setSelectedCoinId(event.target.value)}
              value={selectedCoinId}
            >
              {coins.map((coin) => (
                <option key={coin.id} value={coin.id}>
                  {coin.name} ({coin.symbol})
                </option>
              ))}
            </select>
          </label>

          {activeTab === 'buy' ? (
            <label className={styles.field}>
              <span>Total Gasto</span>
              <input
                className={styles.input}
                inputMode="decimal"
                onChange={(event) =>
                  handleTotalAmountChange(event.target.value)
                }
                placeholder="Ex: US$ 1.234,56"
                type="text"
                value={totalAmountUsd}
              />
            </label>
          ) : (
            <label className={styles.field}>
              <span className={styles.fieldHeader}>
                <span>Quantidade Vendida</span>
                <span className={styles.fieldHint}>
                  {quantityFormatter.format(selectedCoinHoldings)}{' '}
                  {selectedCoin?.symbol ?? ''} disponível
                </span>
              </span>
              <input
                className={styles.input}
                inputMode="decimal"
                onChange={(event) =>
                  handleSellQuantityChange(event.target.value)
                }
                placeholder="Ex: 10.50"
                type="text"
                value={sellQuantity}
              />
            </label>
          )}

          <div className={styles.dateGrid}>
            <label className={styles.field}>
              <span>Data</span>
              <input
                className={styles.input}
                max={maximumTransactionDate}
                min={minimumTransactionDate}
                onChange={(event) => setTransactionDate(event.target.value)}
                type="date"
                value={transactionDate}
              />
            </label>

            <div className={styles.field}>
              <span id="transaction-time-label">Horário</span>
              <div
                aria-labelledby="transaction-time-label"
                className={styles.timeSelectGrid}
              >
                <label className={styles.timeField}>
                  <span>Hora</span>
                  <select
                    className={styles.input}
                    onChange={(event) =>
                      handleTransactionHourChange(event.target.value)
                    }
                    value={transactionHour}
                  >
                    {hourOptions.map((hour) => (
                      <option key={hour} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.timeField}>
                  <span>Minuto</span>
                  <select
                    className={styles.input}
                    onChange={(event) =>
                      handleTransactionMinuteChange(event.target.value)
                    }
                    value={transactionMinute}
                  >
                    {minuteOptions.map((minute) => (
                      <option key={minute} value={minute}>
                        {minute}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>
        </div>

        {feedbackMessage ? (
          <p className={styles.feedback}>{feedbackMessage}</p>
        ) : null}

        <div className={styles.actions}>
          <button
            className={styles.primaryButton}
            disabled={isAddingTransaction}
            onClick={handleAddTransaction}
            type="button"
          >
            {isAddingTransaction ? 'Adicionando' : <>Adicionar Transação</>}
          </button>

          <button
            className={styles.secondaryButton}
            disabled={isAddingTransaction}
            onClick={handleClose}
            type="button"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
