export type CryptoMarketType = 'top' | 'trending';

export type CryptoMarketItem = {
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

type CoinGeckoMarketCoin = {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  current_price?: number;
  market_cap?: number;
  market_cap_rank?: number;
  price_change_percentage_24h?: number;
  price_change_percentage_7d_in_currency?: number;
  sparkline_in_7d?: {
    price?: number[];
  };
  last_updated?: string;
};

type CoinGeckoSearchCoin = {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank?: number | null;
};

type CoinGeckoSearchResponse = {
  coins: CoinGeckoSearchCoin[];
};

type CoinGeckoTrendingResponse = {
  coins: Array<{
    item: {
      id: string;
    };
  }>;
};

type CoinGeckoMarketChartRangeResponse = {
  prices: Array<[number, number]>;
};

type CoinGeckoErrorResponse = {
  error?: string;
  status?: {
    error_message?: string;
  };
};

const DEFAULT_BASE_URL = 'https://api.coingecko.com/api/v3';
const MARKET_TABLE_LIMIT = 15;
const SEARCH_RESULT_LIMIT = 15;
const HISTORICAL_PRICE_RANGE_SECONDS = 60 * 60 * 12;

export class CoinGeckoError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'CoinGeckoError';
    this.status = status;
  }
}

function getCoinGeckoApiKey() {
  const apiKey = process.env.COINGECKO_API_KEY;

  if (!apiKey) {
    throw new CoinGeckoError(
      'Configure COINGECKO_API_KEY no arquivo .env.local.',
      500,
    );
  }

  return apiKey;
}

function getCoinGeckoBaseUrl() {
  return process.env.COINGECKO_API_BASE_URL ?? DEFAULT_BASE_URL;
}

function getCoinGeckoApiKeyHeader() {
  const configuredHeader = process.env.COINGECKO_API_KEY_HEADER;

  if (configuredHeader) {
    return configuredHeader;
  }

  return getCoinGeckoBaseUrl().includes('pro-api')
    ? 'x-cg-pro-api-key'
    : 'x-cg-demo-api-key';
}

async function requestCoinGecko<T>(
  pathname: string,
  params: Record<string, string> = {},
) {
  const baseUrl = `${getCoinGeckoBaseUrl().replace(/\/$/, '')}/`;
  const normalizedPathname = pathname.replace(/^\//, '');
  const url = new URL(normalizedPathname, baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      [getCoinGeckoApiKeyHeader()]: getCoinGeckoApiKey(),
    },
  });

  if (!response.ok) {
    const errorResponse = (await response
      .json()
      .catch(() => null)) as CoinGeckoErrorResponse | null;
    const apiMessage =
      errorResponse?.status?.error_message ?? errorResponse?.error;

    throw new CoinGeckoError(
      apiMessage
        ? `CoinGecko retornou erro: ${apiMessage}`
        : `CoinGecko retornou erro HTTP ${response.status}.`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

function normalizeSearchTerm(searchTerm: string) {
  return searchTerm.trim().toLowerCase();
}

function getSearchPriority(
  crypto: CoinGeckoSearchCoin,
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

function normalizeMarketItem(crypto: CoinGeckoMarketCoin): CryptoMarketItem {
  return {
    id: crypto.id,
    rank: crypto.market_cap_rank ?? 0,
    name: crypto.name,
    symbol: crypto.symbol.toUpperCase(),
    logoUrl: crypto.image ?? null,
    priceUsd: crypto.current_price ?? 0,
    percentChange24h: crypto.price_change_percentage_24h ?? 0,
    percentChange7d: crypto.price_change_percentage_7d_in_currency ?? 0,
    marketCapUsd: crypto.market_cap ?? 0,
    sparklinePrices: crypto.sparkline_in_7d?.price ?? [],
    lastUpdated: crypto.last_updated ?? null,
  };
}

async function getMarketsByIds(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  return requestCoinGecko<CoinGeckoMarketCoin[]>('/coins/markets', {
    ids: ids.join(','),
    locale: 'en',
    order: 'market_cap_desc',
    per_page: String(ids.length),
    price_change_percentage: '24h,7d',
    sparkline: 'true',
    vs_currency: 'usd',
  });
}

function sortMarketsByIdOrder(cryptos: CoinGeckoMarketCoin[], ids: string[]) {
  const idOrder = new Map(ids.map((id, index) => [id, index]));

  return [...cryptos].sort((currentCrypto, nextCrypto) => {
    const currentOrder = idOrder.get(currentCrypto.id) ?? 999999;
    const nextOrder = idOrder.get(nextCrypto.id) ?? 999999;

    return currentOrder - nextOrder;
  });
}

async function getTopMarket() {
  const cryptos = await requestCoinGecko<CoinGeckoMarketCoin[]>(
    '/coins/markets',
    {
      locale: 'en',
      order: 'market_cap_desc',
      page: '1',
      per_page: String(MARKET_TABLE_LIMIT),
      price_change_percentage: '24h,7d',
      sparkline: 'true',
      vs_currency: 'usd',
    },
  );

  return cryptos.map(normalizeMarketItem);
}

async function getTrendingMarket() {
  const trending = await requestCoinGecko<CoinGeckoTrendingResponse>(
    '/search/trending',
  );
  const ids = trending.coins
    .map((crypto) => crypto.item.id)
    .slice(0, MARKET_TABLE_LIMIT);
  const markets = await getMarketsByIds(ids);

  return sortMarketsByIdOrder(markets, ids).map(normalizeMarketItem);
}

function getSearchMatches(searchCoins: CoinGeckoSearchCoin[], searchTerm: string) {
  const normalizedSearchTerm = normalizeSearchTerm(searchTerm);

  if (!normalizedSearchTerm) {
    return [];
  }

  return searchCoins
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

      return (
        (currentCrypto.market_cap_rank ?? 999999) -
        (nextCrypto.market_cap_rank ?? 999999)
      );
    })
    .slice(0, SEARCH_RESULT_LIMIT);
}

export async function getCryptoMarket(type: CryptoMarketType) {
  if (type === 'trending') {
    return getTrendingMarket();
  }

  return getTopMarket();
}

export async function searchCryptoMarket(searchTerm: string) {
  const search = await requestCoinGecko<CoinGeckoSearchResponse>('/search', {
    query: searchTerm,
  });
  const matchedCryptos = getSearchMatches(search.coins, searchTerm);
  const ids = matchedCryptos.map((crypto) => crypto.id);
  const markets = await getMarketsByIds(ids);

  return sortMarketsByIdOrder(markets, ids).map(normalizeMarketItem);
}

export async function getHistoricalCoinPrice(coinId: string, date: Date) {
  const timestamp = Math.floor(date.getTime() / 1000);
  const currentTimestamp = Math.floor(Date.now() / 1000);

  if (!Number.isFinite(timestamp) || timestamp > currentTimestamp) {
    throw new CoinGeckoError('Informe uma data de compra valida.', 400);
  }

  const marketChart = await requestCoinGecko<CoinGeckoMarketChartRangeResponse>(
    `/coins/${coinId}/market_chart/range`,
    {
      from: String(Math.max(timestamp - HISTORICAL_PRICE_RANGE_SECONDS, 0)),
      to: String(
        Math.min(timestamp + HISTORICAL_PRICE_RANGE_SECONDS, currentTimestamp),
      ),
      vs_currency: 'usd',
    },
  );

  const closestPrice = marketChart.prices.reduce<
    { distance: number; price: number } | null
  >((closest, [priceTimestamp, price]) => {
    const distance = Math.abs(priceTimestamp - date.getTime());

    if (!Number.isFinite(price) || price <= 0) {
      return closest;
    }

    if (!closest || distance < closest.distance) {
      return {
        distance,
        price,
      };
    }

    return closest;
  }, null);

  if (!closestPrice) {
    throw new CoinGeckoError(
      'Nao foi possivel encontrar o preco historico desta moeda.',
      404,
    );
  }

  return closestPrice.price;
}
