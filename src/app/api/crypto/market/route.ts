import { NextRequest, NextResponse } from 'next/server';
import {
  CoinMarketCapError,
  getCryptoMarket,
  searchCryptoMarket,
  type CryptoMarketItem,
  type CryptoMarketType,
} from '@/lib/coinMarketCap/client';

type MarketCacheEntry = {
  expiresAt: number;
  data: CryptoMarketItem[];
};

type MarketCache = Partial<Record<CryptoMarketType, MarketCacheEntry>>;
type SearchCache = Record<string, MarketCacheEntry>;

type GlobalWithMarketCache = typeof globalThis & {
  cryptoMarketCache?: MarketCache;
  cryptoSearchCache?: SearchCache;
};

const CACHE_DURATION_MS = 1000 * 60 * 2;
const SEARCH_CACHE_VERSION = 'v2';
const globalWithMarketCache = globalThis as GlobalWithMarketCache;
const marketCache = globalWithMarketCache.cryptoMarketCache ?? {};
const searchCache = globalWithMarketCache.cryptoSearchCache ?? {};

globalWithMarketCache.cryptoMarketCache = marketCache;
globalWithMarketCache.cryptoSearchCache = searchCache;

export const runtime = 'nodejs';

function getMarketType(request: NextRequest): CryptoMarketType {
  const type = request.nextUrl.searchParams.get('type');

  if (type === 'trending') {
    return 'trending';
  }

  return 'top';
}

function getSearchTerm(request: NextRequest) {
  return request.nextUrl.searchParams.get('search')?.trim() ?? '';
}

async function getCachedMarket(type: CryptoMarketType) {
  const cached = marketCache[type];

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const data = await getCryptoMarket(type);

  marketCache[type] = {
    data,
    expiresAt: Date.now() + CACHE_DURATION_MS,
  };

  return data;
}

async function getCachedSearch(searchTerm: string) {
  const cacheKey = `${SEARCH_CACHE_VERSION}:${searchTerm.toLowerCase()}`;
  const cached = searchCache[cacheKey];

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const data = await searchCryptoMarket(searchTerm);

  searchCache[cacheKey] = {
    data,
    expiresAt: Date.now() + CACHE_DURATION_MS,
  };

  return data;
}

export async function GET(request: NextRequest) {
  const type = getMarketType(request);
  const searchTerm = getSearchTerm(request);

  try {
    const data = searchTerm
      ? await getCachedSearch(searchTerm)
      : await getCachedMarket(type);

    return NextResponse.json({
      data,
      search: searchTerm || null,
      type,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof CoinMarketCapError) {
      return NextResponse.json(
        {
          message: error.message,
        },
        {
          status: error.status,
        },
      );
    }

    console.error('Erro ao buscar criptomoedas:', error);

    return NextResponse.json(
      {
        message: 'Nao foi possivel carregar os dados de criptomoedas.',
      },
      {
        status: 500,
      },
    );
  }
}
