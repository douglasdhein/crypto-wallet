"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { PortfolioCoin } from "@/components/PortfolioTable";
import styles from "./style.module.css";

type CryptoMarketResponse = {
  data?: PortfolioCoin[];
  message?: string;
};

type PortfolioCoinModalProps = {
  addedCoinIds: string[];
  isOpen: boolean;
  onAddCoin: (coin: PortfolioCoin) => Promise<{
    ok: boolean;
    message?: string;
  }>;
  onClose: () => void;
};

const SEARCH_DEBOUNCE_MS = 400;

export function PortfolioCoinModal({
  addedCoinIds,
  isOpen,
  onAddCoin,
  onClose,
}: PortfolioCoinModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<PortfolioCoin[]>([]);
  const [selectedCoinId, setSelectedCoinId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isAddingCoin, setIsAddingCoin] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const normalizedSearchTerm = searchTerm.trim();
  const selectedCoin = useMemo(
    () => results.find((coin) => coin.id === selectedCoinId) ?? null,
    [results, selectedCoinId],
  );

  useEffect(() => {
    if (!isOpen || normalizedSearchTerm.length < 2) {
      return;
    }

    const controller = new AbortController();
    let isActiveSearch = true;

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/crypto/market?search=${encodeURIComponent(
            normalizedSearchTerm,
          )}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const result = (await response.json()) as CryptoMarketResponse;

        if (!response.ok) {
          throw new Error(
            result.message ?? "Nao foi possivel pesquisar criptomoedas.",
          );
        }

        if (!isActiveSearch) {
          return;
        }

        setResults(result.data ?? []);
        setSelectedCoinId(null);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (!isActiveSearch) {
          return;
        }

        setResults([]);
        setSelectedCoinId(null);
        setFeedbackMessage(
          error instanceof Error
            ? error.message
            : "Nao foi possivel pesquisar criptomoedas.",
        );
      } finally {
        if (isActiveSearch) {
          setIsSearching(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      isActiveSearch = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isOpen, normalizedSearchTerm]);

  function handleSearchTermChange(nextSearchTerm: string) {
    setSearchTerm(nextSearchTerm);
    setSelectedCoinId(null);
    setFeedbackMessage(null);

    if (nextSearchTerm.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
  }

  function handleClose() {
    setSearchTerm("");
    setResults([]);
    setSelectedCoinId(null);
    setFeedbackMessage(null);
    setIsAddingCoin(false);
    setIsSearching(false);
    onClose();
  }

  async function handleAddCoin() {
    if (!selectedCoin) {
      setFeedbackMessage("Selecione uma moeda antes de adicionar.");
      return;
    }

    setIsAddingCoin(true);

    try {
      const result = await onAddCoin(selectedCoin);

      if (!result.ok) {
        setFeedbackMessage(
          result.message ?? "Nao foi possivel adicionar a moeda ao portfolio.",
        );
        return;
      }

      handleClose();
    } finally {
      setIsAddingCoin(false);
    }
  }

  return (
    <div
      aria-hidden={!isOpen}
      className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ""}`}
    >
      <div
        aria-labelledby="portfolio-coin-modal-title"
        aria-modal="true"
        className={styles.modal}
        role="dialog"
      >
        <div className={styles.heading}>
          <h2 className={styles.title} id="portfolio-coin-modal-title">
            Adicionar moeda
          </h2>
          <p className={styles.description}>
            Pesquise pelo nome ou token da criptomoeda.
          </p>
        </div>

        <label className={styles.field}>
          <span>Pesquisar moeda</span>
          <input
            className={styles.input}
            onChange={(event) => handleSearchTermChange(event.target.value)}
            placeholder="Bitcoin ou BTC"
            type="search"
            value={searchTerm}
          />
        </label>

        {normalizedSearchTerm.length >= 2 ? (
          <div className={styles.resultsList}>
            {isSearching ? (
              <p className={styles.stateMessage}>Buscando moedas...</p>
            ) : null}

            {!isSearching && results.length === 0 ? (
              <p className={styles.stateMessage}>Nenhuma moeda encontrada.</p>
            ) : null}

            {results.map((coin) => {
              const isSelected = coin.id === selectedCoinId;
              const isAdded = addedCoinIds.includes(coin.id);

              return (
                <button
                  aria-pressed={isSelected}
                  className={`${styles.resultButton} ${
                    isSelected ? styles.resultButtonSelected : ""
                  }`}
                  disabled={isAdded}
                  key={coin.id}
                  onClick={() => setSelectedCoinId(coin.id)}
                  type="button"
                >
                  <span className={styles.coinInfo}>
                    {coin.logoUrl ? (
                      <Image
                        alt=""
                        className={styles.coinLogo}
                        height={32}
                        src={coin.logoUrl}
                        width={32}
                      />
                    ) : (
                      <span className={styles.coinFallback}>
                        {coin.symbol.charAt(0)}
                      </span>
                    )}
                    <span>
                      <span className={styles.coinName}>{coin.name}</span>
                      <span className={styles.coinSymbol}>{coin.symbol}</span>
                    </span>
                  </span>
                  <span className={styles.resultStatus}>
                    {isAdded ? "Adicionada" : isSelected ? "Selecionada" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {feedbackMessage ? (
          <p className={styles.feedback}>{feedbackMessage}</p>
        ) : null}

        <div className={styles.actions}>
          <button
            className={styles.primaryButton}
            disabled={!selectedCoin || isAddingCoin}
            onClick={handleAddCoin}
            type="button"
          >
            {isAddingCoin ? "Adicionando..." : "Add Coins"}
          </button>

          <button
            className={styles.secondaryButton}
            disabled={isAddingCoin}
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
