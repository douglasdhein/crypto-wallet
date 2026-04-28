"use client";

import { useState } from "react";
import type { PortfolioCoin } from "@/components/PortfolioTable";
import styles from "./style.module.css";

type TransactionType = "buy" | "sell";

type PortfolioTransaction = {
  id: string;
  executedAt: string;
  historicalPriceUsd: number;
  quantity: number;
  totalAmountUsd: number;
  type: TransactionType;
};

type EditTransactionPayload = {
  coinId: string;
  executedAt: string;
  id: string;
} & (
  | {
      totalAmountUsd: number;
      type: "buy";
    }
  | {
      quantity: number;
      type: "sell";
    }
);

type PortfolioTransactionEditModalProps = {
  coin: PortfolioCoin;
  onClose: () => void;
  onEditTransaction: (payload: EditTransactionPayload) => Promise<{
    ok: boolean;
    message?: string;
  }>;
  transaction: PortfolioTransaction;
};

const hourOptions = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0"),
);
const minuteOptions = Array.from({ length: 60 }, (_, minute) =>
  String(minute).padStart(2, "0"),
);

const currencyIntegerFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

const quantityFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 8,
});

const TRANSACTION_HISTORY_LIMIT_DAYS = 365;

function padTimePart(value: number) {
  return String(value).padStart(2, "0");
}

function getDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = padTimePart(date.getMonth() + 1);
  const day = padTimePart(date.getDate());

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

function getDateValue(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return getTodayDateValue();
  }

  return getDateInputValue(date);
}

function getTimeValue(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "00:00";
  }

  return `${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}`;
}

function formatMoneyInput(value: string) {
  const sanitizedValue = value.replace(/[^\d,]/g, "");

  if (!sanitizedValue) {
    return "";
  }

  const [integerPart = "", ...decimalParts] = sanitizedValue.split(",");
  const hasDecimalSeparator = sanitizedValue.includes(",");
  const decimalPart = decimalParts.join("").slice(0, 2);
  const normalizedIntegerPart = integerPart.replace(/^0+(?=\d)/, "");
  const formattedIntegerPart = currencyIntegerFormatter.format(
    Number(normalizedIntegerPart || "0"),
  );

  if (hasDecimalSeparator) {
    return `${formattedIntegerPart},${decimalPart}`;
  }

  return formattedIntegerPart;
}

function formatMoneyValue(value: number) {
  const [integerPart = "0", decimalPart = "00"] = value.toFixed(2).split(".");

  return `${currencyIntegerFormatter.format(Number(integerPart))},${decimalPart}`;
}

function parseDecimalInput(value: string) {
  const normalizedValue = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value;

  return Number(normalizedValue);
}

export function PortfolioTransactionEditModal({
  coin,
  onClose,
  onEditTransaction,
  transaction,
}: PortfolioTransactionEditModalProps) {
  const [totalAmountUsd, setTotalAmountUsd] = useState(
    transaction.type === "buy"
      ? formatMoneyValue(transaction.totalAmountUsd)
      : "",
  );
  const [sellQuantity, setSellQuantity] = useState(
    transaction.type === "sell"
      ? quantityFormatter.format(transaction.quantity)
      : "",
  );
  const [transactionDate, setTransactionDate] = useState(
    getDateValue(transaction.executedAt),
  );
  const [transactionTime, setTransactionTime] = useState(
    getTimeValue(transaction.executedAt),
  );
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isEditingTransaction, setIsEditingTransaction] = useState(false);
  const [transactionHour = "00", transactionMinute = "00"] =
    transactionTime.split(":");
  const availableSellQuantity =
    (coin.holdings ?? 0) +
    (transaction.type === "sell" ? transaction.quantity : 0);
  const maximumTransactionDate = getTodayDateValue();
  const minimumTransactionDate = getMinimumTransactionDateValue();

  function handleClose() {
    if (isEditingTransaction) {
      return;
    }

    onClose();
  }

  function handleTotalAmountChange(nextTotalAmount: string) {
    setTotalAmountUsd(formatMoneyInput(nextTotalAmount));
  }

  function handleSellQuantityChange(nextQuantity: string) {
    setSellQuantity(nextQuantity.replace(/[^\d,.]/g, ""));
  }

  function handleTransactionHourChange(nextHour: string) {
    setTransactionTime(`${nextHour}:${transactionMinute}`);
  }

  function handleTransactionMinuteChange(nextMinute: string) {
    setTransactionTime(`${transactionHour}:${nextMinute}`);
  }

  async function handleEditTransaction() {
    const parsedTotalAmountUsd = parseDecimalInput(totalAmountUsd);
    const parsedSellQuantity = parseDecimalInput(sellQuantity);

    setFeedbackMessage(null);

    if (
      transaction.type === "buy" &&
      (!Number.isFinite(parsedTotalAmountUsd) || parsedTotalAmountUsd <= 0)
    ) {
      setFeedbackMessage("Informe um total gasto maior que zero.");
      return;
    }

    if (
      transaction.type === "sell" &&
      (!Number.isFinite(parsedSellQuantity) || parsedSellQuantity <= 0)
    ) {
      setFeedbackMessage("Informe uma quantidade vendida maior que zero.");
      return;
    }

    if (
      transaction.type === "sell" &&
      parsedSellQuantity > availableSellQuantity
    ) {
      setFeedbackMessage("A quantidade vendida nao pode ser maior que seu saldo.");
      return;
    }

    const executedAt = new Date(`${transactionDate}T${transactionTime}`);

    if (Number.isNaN(executedAt.getTime())) {
      setFeedbackMessage("Informe data e horario validos.");
      return;
    }

    if (executedAt < new Date(`${minimumTransactionDate}T00:00`)) {
      setFeedbackMessage(
        "A data da transacao deve estar dentro dos ultimos 365 dias.",
      );
      return;
    }

    if (executedAt.getTime() > Date.now()) {
      setFeedbackMessage("A data da transacao nao pode ser futura.");
      return;
    }

    setIsEditingTransaction(true);

    let shouldKeepModalMounted = true;

    try {
      const result = await onEditTransaction(
        transaction.type === "buy"
          ? {
              coinId: coin.id,
              executedAt: executedAt.toISOString(),
              id: transaction.id,
              totalAmountUsd: parsedTotalAmountUsd,
              type: transaction.type,
            }
          : {
              coinId: coin.id,
              executedAt: executedAt.toISOString(),
              id: transaction.id,
              quantity: parsedSellQuantity,
              type: transaction.type,
            },
      );

      if (!result.ok) {
        setFeedbackMessage(
          result.message ?? "Nao foi possivel editar a transacao.",
        );
        return;
      }

      shouldKeepModalMounted = false;
      onClose();
    } finally {
      if (shouldKeepModalMounted) {
        setIsEditingTransaction(false);
      }
    }
  }

  return (
    <div className={styles.overlay}>
      <div
        aria-labelledby="portfolio-edit-transaction-title"
        aria-modal="true"
        className={styles.modal}
        role="dialog"
      >
        <h2 className={styles.title} id="portfolio-edit-transaction-title">
          Editar Transa&ccedil;&atilde;o
        </h2>

        <div className={styles.tabs}>
          <button
            aria-pressed={transaction.type === "buy"}
            className={`${styles.tabButton} ${
              transaction.type === "buy"
                ? styles.tabButtonActive
                : styles.tabButtonInactive
            }`}
            disabled
            type="button"
          >
            Compra
          </button>

          <button
            aria-pressed={transaction.type === "sell"}
            className={`${styles.tabButton} ${
              transaction.type === "sell"
                ? styles.tabButtonActive
                : styles.tabButtonInactive
            }`}
            disabled
            type="button"
          >
            Venda
          </button>
        </div>

        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Moeda</span>
            <select className={styles.input} disabled value={coin.id}>
              <option value={coin.id}>
                {coin.name} ({coin.symbol})
              </option>
            </select>
          </label>

          {transaction.type === "buy" ? (
            <label className={styles.field}>
              <span>Total Gasto</span>
              <input
                className={styles.input}
                inputMode="decimal"
                onChange={(event) => handleTotalAmountChange(event.target.value)}
                placeholder="Ex: 1.234,56"
                type="text"
                value={totalAmountUsd}
              />
            </label>
          ) : (
            <label className={styles.field}>
              <span className={styles.fieldHeader}>
                <span>Quantidade vendida</span>
                <span className={styles.fieldHint}>
                  {quantityFormatter.format(availableSellQuantity)}{" "}
                  {coin.symbol} disponivel
                </span>
              </span>
              <input
                className={styles.input}
                inputMode="decimal"
                onChange={(event) => handleSellQuantityChange(event.target.value)}
                placeholder="Ex: 0,5"
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
              <span id="edit-transaction-time-label">Horario</span>
              <div
                aria-labelledby="edit-transaction-time-label"
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
            disabled={isEditingTransaction}
            onClick={handleEditTransaction}
            type="button"
          >
            {isEditingTransaction ? (
              "Salvando..."
            ) : (
              <>Salvar altera&ccedil;&otilde;es</>
            )}
          </button>

          <button
            className={styles.secondaryButton}
            disabled={isEditingTransaction}
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
