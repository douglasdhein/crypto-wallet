import { NextResponse } from 'next/server';
import {
  CoinGeckoError,
  getCryptoGlobalMarketData,
  type CryptoGlobalMarketData,
} from '@/lib/coinGecko/client';

type GlobalMarketCacheEntry = {
  data: CryptoGlobalMarketData;
  expiresAt: number;
};

type GlobalWithCryptoGlobalMarketCache = typeof globalThis & {
  cryptoGlobalMarketCache?: GlobalMarketCacheEntry;
};

const CACHE_DURATION_MS = 1000 * 60 * 2;
const globalWithCryptoGlobalMarketCache =
  globalThis as GlobalWithCryptoGlobalMarketCache;

export const runtime = 'nodejs';

async function getCachedGlobalMarketData() {
  const cached = globalWithCryptoGlobalMarketCache.cryptoGlobalMarketCache;

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const data = await getCryptoGlobalMarketData();

  globalWithCryptoGlobalMarketCache.cryptoGlobalMarketCache = {
    data,
    expiresAt: Date.now() + CACHE_DURATION_MS,
  };

  return data;
}

export async function GET() {
  try {
    const data = await getCachedGlobalMarketData();

    return NextResponse.json({
      data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof CoinGeckoError) {
      return NextResponse.json(
        {
          message: error.message,
        },
        {
          status: error.status,
        },
      );
    }

    console.error('Erro ao buscar dados globais de criptomoedas:', error);

    return NextResponse.json(
      {
        message: 'Não foi possível carregar os dados globais do mercado.',
      },
      {
        status: 500,
      },
    );
  }
}
