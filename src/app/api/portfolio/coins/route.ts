import { NextRequest, NextResponse } from "next/server";
import { getSessionFromToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/db/mongodb";
import { PortfolioCoinModel } from "@/models/PortfolioCoin";
import { PortfolioTransactionModel } from "@/models/PortfolioTransaction";

type PortfolioCoinRequestBody = {
  id?: unknown;
  name?: unknown;
  symbol?: unknown;
  logoUrl?: unknown;
  priceUsd?: unknown;
  percentChange24h?: unknown;
  percentChange7d?: unknown;
  sparklinePrices?: unknown;
};

type DeletePortfolioCoinRequestBody = {
  id?: unknown;
};

type PortfolioCoinValidationResult =
  | {
      isValid: true;
      coin: {
        coinId: string;
        name: string;
        symbol: string;
        logoUrl: string | null;
        priceUsd: number;
        percentChange24h: number;
        percentChange7d: number;
        sparklinePrices: number[];
      };
    }
  | {
      isValid: false;
      message: string;
    };

export const runtime = "nodejs";

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeSparklinePrices(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (price): price is number => typeof price === "number" && Number.isFinite(price),
  );
}

function formatPortfolioCoin(coin: {
  coinId: string;
  name: string;
  symbol: string;
  logoUrl?: string | null;
  priceUsd: number;
  percentChange24h: number;
  percentChange7d: number;
  sparklinePrices: number[];
  costBasisUsd?: number;
  holdings?: number;
}) {
  return {
    id: coin.coinId,
    name: coin.name,
    symbol: coin.symbol,
    logoUrl: coin.logoUrl ?? null,
    priceUsd: coin.priceUsd,
    percentChange24h: coin.percentChange24h,
    percentChange7d: coin.percentChange7d,
    sparklinePrices: coin.sparklinePrices,
    costBasisUsd: coin.costBasisUsd ?? 0,
    holdings: coin.holdings ?? 0,
  };
}

function validatePortfolioCoinBody(
  body: PortfolioCoinRequestBody,
): PortfolioCoinValidationResult {
  const coinId = typeof body.id === "string" ? body.id.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const symbol =
    typeof body.symbol === "string" ? body.symbol.trim().toUpperCase() : "";
  const logoUrl = typeof body.logoUrl === "string" ? body.logoUrl.trim() : null;

  if (!coinId || !name || !symbol) {
    return {
      isValid: false,
      message: "Selecione uma moeda valida para adicionar ao portfolio.",
    };
  }

  return {
    isValid: true,
    coin: {
      coinId,
      name,
      symbol,
      logoUrl,
      priceUsd: normalizeNumber(body.priceUsd),
      percentChange24h: normalizeNumber(body.percentChange24h),
      percentChange7d: normalizeNumber(body.percentChange7d),
      sparklinePrices: normalizeSparklinePrices(body.sparklinePrices),
    },
  };
}

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function getPortfolioMetrics(
  transactions: Array<{
    coinId: string;
    quantity: number;
    totalAmountUsd: number;
    type: "buy" | "sell";
  }>,
) {
  return transactions.reduce<
    Record<
      string,
      {
        holdings: number;
        totalBuyAmountUsd: number;
        totalBuyQuantity: number;
      }
    >
  >((metrics, transaction) => {
    const currentMetrics = metrics[transaction.coinId] ?? {
      holdings: 0,
      totalBuyAmountUsd: 0,
      totalBuyQuantity: 0,
    };

    if (transaction.type === "buy") {
      currentMetrics.holdings += transaction.quantity;
      currentMetrics.totalBuyAmountUsd += transaction.totalAmountUsd;
      currentMetrics.totalBuyQuantity += transaction.quantity;
    } else {
      currentMetrics.holdings -= transaction.quantity;
    }

    return {
      ...metrics,
      [transaction.coinId]: currentMetrics,
    };
  }, {});
}

function getCostBasisUsd(metrics?: {
  holdings: number;
  totalBuyAmountUsd: number;
  totalBuyQuantity: number;
}) {
  if (!metrics || metrics.holdings <= 0 || metrics.totalBuyQuantity <= 0) {
    return 0;
  }

  return (
    metrics.holdings * (metrics.totalBuyAmountUsd / metrics.totalBuyQuantity)
  );
}

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = getSessionFromToken(sessionToken);

  if (!sessionUser) {
    return NextResponse.json(
      {
        message: "Voce precisa estar logado para acessar o portfolio.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    await connectMongoDB();

    const coins = await PortfolioCoinModel.find({
      userId: sessionUser.id,
    }).sort({
      createdAt: 1,
    });
    const transactions = await PortfolioTransactionModel.find({
      userId: sessionUser.id,
    });
    const metricsByCoinId = getPortfolioMetrics(transactions);

    return NextResponse.json({
      data: coins.map((coin) =>
        formatPortfolioCoin({
          coinId: coin.coinId,
          name: coin.name,
          symbol: coin.symbol,
          logoUrl: coin.logoUrl,
          priceUsd: coin.priceUsd,
          percentChange24h: coin.percentChange24h,
          percentChange7d: coin.percentChange7d,
          sparklinePrices: coin.sparklinePrices,
          costBasisUsd: getCostBasisUsd(metricsByCoinId[coin.coinId]),
          holdings: metricsByCoinId[coin.coinId]?.holdings ?? 0,
        }),
      ),
    });
  } catch (error) {
    console.error("Erro ao carregar moedas do portfolio:", error);

    return NextResponse.json(
      {
        message: "Nao foi possivel carregar as moedas do portfolio.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = getSessionFromToken(sessionToken);

  if (!sessionUser) {
    return NextResponse.json(
      {
        message: "Voce precisa estar logado para adicionar moedas ao portfolio.",
      },
      {
        status: 401,
      },
    );
  }

  let body: PortfolioCoinRequestBody;

  try {
    body = (await request.json()) as PortfolioCoinRequestBody;
  } catch {
    return NextResponse.json(
      {
        message: "Envie um corpo JSON valido.",
      },
      {
        status: 400,
      },
    );
  }

  const validation = validatePortfolioCoinBody(body);

  if (!validation.isValid) {
    return NextResponse.json(
      {
        message: validation.message,
      },
      {
        status: 400,
      },
    );
  }

  try {
    await connectMongoDB();

    const coin = await PortfolioCoinModel.create({
      ...validation.coin,
      userId: sessionUser.id,
    });

    return NextResponse.json(
      {
        coin: formatPortfolioCoin(coin),
        message: "Moeda adicionada ao portfolio.",
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const existingCoin = await PortfolioCoinModel.findOne({
        coinId: validation.coin.coinId,
        userId: sessionUser.id,
      });

      return NextResponse.json({
        coin: existingCoin ? formatPortfolioCoin(existingCoin) : null,
        message: "Esta moeda ja esta no seu portfolio.",
      });
    }

    console.error("Erro ao adicionar moeda ao portfolio:", error);

    return NextResponse.json(
      {
        message: "Nao foi possivel adicionar a moeda ao portfolio.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = getSessionFromToken(sessionToken);

  if (!sessionUser) {
    return NextResponse.json(
      {
        message: "Voce precisa estar logado para excluir moedas do portfolio.",
      },
      {
        status: 401,
      },
    );
  }

  let body: DeletePortfolioCoinRequestBody;

  try {
    body = (await request.json()) as DeletePortfolioCoinRequestBody;
  } catch {
    return NextResponse.json(
      {
        message: "Envie um corpo JSON valido.",
      },
      {
        status: 400,
      },
    );
  }

  const coinId = typeof body.id === "string" ? body.id.trim() : "";

  if (!coinId) {
    return NextResponse.json(
      {
        message: "Informe a moeda que deseja excluir.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    await connectMongoDB();

    const deletedCoin = await PortfolioCoinModel.findOneAndDelete({
      coinId,
      userId: sessionUser.id,
    });

    if (!deletedCoin) {
      return NextResponse.json(
        {
          message: "Moeda nao encontrada no portfolio.",
        },
        {
          status: 404,
        },
      );
    }

    await PortfolioTransactionModel.deleteMany({
      coinId,
      userId: sessionUser.id,
    });

    return NextResponse.json({
      message: "Moeda excluida do portfolio.",
    });
  } catch (error) {
    console.error("Erro ao excluir moeda do portfolio:", error);

    return NextResponse.json(
      {
        message: "Nao foi possivel excluir a moeda do portfolio.",
      },
      {
        status: 500,
      },
    );
  }
}
