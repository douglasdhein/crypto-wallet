export type CryptoMarketType = 'top' | 'trending';

export type CryptoMarketItem = {
  id: number;
  rank: number;
  name: string;
  symbol: string;
  logoUrl: string | null;
  priceUsd: number;
  percentChange24h: number;
  percentChange7d: number;
  marketCapUsd: number;
  lastUpdated: string | null;
};

type CoinMarketCapMapCrypto = {
  id: number;
  rank?: number;
  name: string;
  symbol: string;
  slug: string;
  is_active?: number;
};

type CoinMarketCapQuote = {
  id?: number;
  symbol?: string;
  price?: number;
  percent_change_24h?: number;
  percent_change_7d?: number;
  market_cap?: number;
  last_updated?: string;
};

type CoinMarketCapCrypto = {
  id: number;
  name: string;
  symbol: string;
  cmc_rank?: number;
  quote?: {
    USD?: CoinMarketCapQuote;
  } | CoinMarketCapQuote[];
};

type CoinMarketCapListingsResponse = {
  data: CoinMarketCapCrypto[];
};

type CoinMarketCapMapResponse = {
  data: CoinMarketCapMapCrypto[];
};

type CoinMarketCapQuotesResponse = {
  data: CoinMarketCapCrypto[];
};

type CoinMarketCapInfoResponse = {
  data: Record<
    string,
    {
      logo?: string;
    }
  >;
};

type CoinMarketCapErrorResponse = {
  status?: {
    error_message?: string;
  };
};

const DEFAULT_BASE_URL = 'https://pro-api.coinmarketcap.com';
const MARKET_LIMIT = 20;
const SEARCH_RESULT_LIMIT = 20;
const CRYPTO_MAP_CACHE_DURATION_MS = 1000 * 60 * 10;

type CryptoMapCache = {
  data: CoinMarketCapMapCrypto[];
  expiresAt: number;
};

type GlobalWithCryptoMapCache = typeof globalThis & {
  cryptoMapCache?: CryptoMapCache;
};

const globalWithCryptoMapCache = globalThis as GlobalWithCryptoMapCache;

export class CoinMarketCapError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'CoinMarketCapError';
    this.status = status;
  }
}

function getCoinMarketCapApiKey() {
  const apiKey = process.env.COINMARKETCAP_API_KEY;

  if (!apiKey) {
    throw new CoinMarketCapError(
      'Configure COINMARKETCAP_API_KEY no arquivo .env.local.',
      500,
    );
  }

  return apiKey;
}

function getCoinMarketCapBaseUrl() {
  return process.env.COINMARKETCAP_API_BASE_URL ?? DEFAULT_BASE_URL;
}

async function requestCoinMarketCap<T>(
  pathname: string,
  params: Record<string, string>,
) {
  const url = new URL(pathname, getCoinMarketCapBaseUrl());

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'X-CMC_PRO_API_KEY': getCoinMarketCapApiKey(),
    },
  });

  if (!response.ok) {
    const errorResponse = (await response
      .json()
      .catch(() => null)) as CoinMarketCapErrorResponse | null;
    const apiMessage = errorResponse?.status?.error_message;

    throw new CoinMarketCapError(
      apiMessage
        ? `CoinMarketCap retornou erro: ${apiMessage}`
        : `CoinMarketCap retornou erro HTTP ${response.status}.`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

function getMarketEndpoint() {
  return '/v1/cryptocurrency/listings/latest';
}

function getMarketParams(type: CryptoMarketType) {
  const params: Record<string, string> = {
    start: '1',
    limit: String(MARKET_LIMIT),
    convert: 'USD',
  };

  if (type === 'trending') {
    params.sort = 'volume_24h';
    params.sort_dir = 'desc';
  }

  return params;
}

function normalizeSearchTerm(searchTerm: string) {
  return searchTerm.trim().toLowerCase();
}

function getSearchPriority(
  crypto: CoinMarketCapMapCrypto,
  normalizedSearchTerm: string,
) {
  const normalizedName = crypto.name.toLowerCase();
  const normalizedSymbol = crypto.symbol.toLowerCase();

  if (normalizedName === normalizedSearchTerm) {
    return 1;
  }

  if (normalizedSymbol === normalizedSearchTerm) {
    return 2;
  }

  if (normalizedName.startsWith(normalizedSearchTerm)) {
    return 3;
  }

  if (normalizedSymbol.startsWith(normalizedSearchTerm)) {
    return 4;
  }

  return 5;
}

function normalizeMarketItem(
  crypto: CoinMarketCapCrypto,
  index: number,
  logosById: Record<string, { logo?: string }>,
): CryptoMarketItem {
  const quote = Array.isArray(crypto.quote)
    ? crypto.quote.find((currencyQuote) => currencyQuote.symbol === 'USD')
    : crypto.quote?.USD;

  return {
    id: crypto.id,
    rank: crypto.cmc_rank ?? index + 1,
    name: crypto.name,
    symbol: crypto.symbol,
    logoUrl: logosById[String(crypto.id)]?.logo ?? null,
    priceUsd: quote?.price ?? 0,
    percentChange24h: quote?.percent_change_24h ?? 0,
    percentChange7d: quote?.percent_change_7d ?? 0,
    marketCapUsd: quote?.market_cap ?? 0,
    lastUpdated: quote?.last_updated ?? null,
  };
}

async function getCoinLogos(cryptos: CoinMarketCapCrypto[]) {
  const ids = cryptos.map((crypto) => crypto.id).join(',');

  if (!ids) {
    return {};
  }

  const info = await requestCoinMarketCap<CoinMarketCapInfoResponse>(
    '/v2/cryptocurrency/info',
    {
      id: ids,
    },
  );

  return info.data;
}

async function getCryptoMap() {
  const cached = globalWithCryptoMapCache.cryptoMapCache;

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const response = await requestCoinMarketCap<CoinMarketCapMapResponse>(
    '/v1/cryptocurrency/map',
    {
      listing_status: 'active',
      sort: 'cmc_rank',
    },
  );

  globalWithCryptoMapCache.cryptoMapCache = {
    data: response.data,
    expiresAt: Date.now() + CRYPTO_MAP_CACHE_DURATION_MS,
  };

  return response.data;
}

function getSearchMatches(
  cryptos: CoinMarketCapMapCrypto[],
  searchTerm: string,
) {
  const normalizedSearchTerm = normalizeSearchTerm(searchTerm);

  if (!normalizedSearchTerm) {
    return [];
  }

  return cryptos
    .filter((crypto) => {
      const normalizedName = crypto.name.toLowerCase();
      const normalizedSymbol = crypto.symbol.toLowerCase();

      return (
        normalizedName.includes(normalizedSearchTerm) ||
        normalizedSymbol.includes(normalizedSearchTerm)
      );
    })
    .sort((currentCrypto, nextCrypto) => {
      const currentPriority = getSearchPriority(
        currentCrypto,
        normalizedSearchTerm,
      );
      const nextPriority = getSearchPriority(nextCrypto, normalizedSearchTerm);

      if (currentPriority !== nextPriority) {
        return currentPriority - nextPriority;
      }

      return (currentCrypto.rank ?? 999999) - (nextCrypto.rank ?? 999999);
    })
    .slice(0, SEARCH_RESULT_LIMIT);
}

async function getCryptoQuotes(cryptos: CoinMarketCapMapCrypto[]) {
  const ids = cryptos.map((crypto) => crypto.id).join(',');

  if (!ids) {
    return {};
  }

  const response = await requestCoinMarketCap<CoinMarketCapQuotesResponse>(
    '/v3/cryptocurrency/quotes/latest',
    {
      id: ids,
      convert: 'USD',
    },
  );

  return Object.fromEntries(
    response.data.map((crypto) => [String(crypto.id), crypto]),
  );
}

export async function getCryptoMarket(type: CryptoMarketType) {
  const response = await requestCoinMarketCap<CoinMarketCapListingsResponse>(
    getMarketEndpoint(),
    getMarketParams(type),
  );

  const cryptos = response.data.slice(0, MARKET_LIMIT);
  const logosById = await getCoinLogos(cryptos);

  return cryptos.map((crypto, index) =>
    normalizeMarketItem(crypto, index, logosById),
  );
}

export async function searchCryptoMarket(searchTerm: string) {
  const cryptoMap = await getCryptoMap();
  const matchedCryptos = getSearchMatches(cryptoMap, searchTerm);
  const quotesById = await getCryptoQuotes(matchedCryptos);
  const cryptos = matchedCryptos.map((mappedCrypto) => {
    const quoteCrypto = quotesById[String(mappedCrypto.id)];

    return (
      quoteCrypto ?? {
        id: mappedCrypto.id,
        cmc_rank: mappedCrypto.rank,
        name: mappedCrypto.name,
        symbol: mappedCrypto.symbol,
      }
    );
  });
  const logosById = await getCoinLogos(cryptos);

  return cryptos.map((crypto, index) =>
    normalizeMarketItem(crypto, index, logosById),
  );
}
