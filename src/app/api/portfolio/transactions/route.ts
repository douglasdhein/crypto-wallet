import { NextRequest, NextResponse } from "next/server";
import { getSessionFromToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getHistoricalCoinPrice, CoinGeckoError } from "@/lib/coinGecko/client";
import { connectMongoDB } from "@/lib/db/mongodb";
import { PortfolioCoinModel } from "@/models/PortfolioCoin";
import { PortfolioTransactionModel } from "@/models/PortfolioTransaction";

type PortfolioTransactionRequestBody = {
  coinId?: unknown;
  executedAt?: unknown;
  id?: unknown;
  quantity?: unknown;
  totalAmountUsd?: unknown;
  type?: unknown;
};

type DeletePortfolioTransactionRequestBody = {
  id?: unknown;
};

type ValidatedTransaction = {
  coinId: string;
  executedAt: Date;
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

type TransactionValidationResult =
  | {
      isValid: true;
      transaction: ValidatedTransaction;
    }
  | {
      isValid: false;
      message: string;
    };

export const runtime = "nodejs";

const TRANSACTION_HISTORY_LIMIT_DAYS = 365;
const TRANSACTION_HISTORY_LIMIT_MS =
  TRANSACTION_HISTORY_LIMIT_DAYS * 24 * 60 * 60 * 1000;

function getMinimumTransactionDate() {
  const minimumDate = new Date(Date.now() - TRANSACTION_HISTORY_LIMIT_MS);

  minimumDate.setHours(0, 0, 0, 0);

  return minimumDate;
}

function validateTransactionBody(
  body: PortfolioTransactionRequestBody,
): TransactionValidationResult {
  const coinId = typeof body.coinId === "string" ? body.coinId.trim() : "";
  const totalAmountUsd =
    typeof body.totalAmountUsd === "number" && Number.isFinite(body.totalAmountUsd)
      ? body.totalAmountUsd
      : 0;
  const quantity =
    typeof body.quantity === "number" && Number.isFinite(body.quantity)
      ? body.quantity
      : 0;
  const executedAt =
    typeof body.executedAt === "string" ? new Date(body.executedAt) : null;
  const type = body.type === "buy" || body.type === "sell" ? body.type : null;

  if (!coinId) {
    return {
      isValid: false,
      message: "Selecione uma moeda para adicionar a transacao.",
    };
  }

  if (!type) {
    return {
      isValid: false,
      message: "Informe se a transacao e de compra ou venda.",
    };
  }

  if (type === "buy" && totalAmountUsd <= 0) {
    return {
      isValid: false,
      message: "Informe um total gasto maior que zero.",
    };
  }

  if (type === "sell" && quantity <= 0) {
    return {
      isValid: false,
      message: "Informe uma quantidade vendida maior que zero.",
    };
  }

  if (!executedAt || Number.isNaN(executedAt.getTime())) {
    return {
      isValid: false,
      message: "Informe uma data e horario validos.",
    };
  }

  if (executedAt.getTime() > Date.now()) {
    return {
      isValid: false,
      message: "A data da transacao nao pode ser futura.",
    };
  }

  if (executedAt.getTime() < getMinimumTransactionDate().getTime()) {
    return {
      isValid: false,
      message: "A data da transacao deve estar dentro dos ultimos 365 dias.",
    };
  }

  if (type === "buy") {
    return {
      isValid: true,
      transaction: {
        coinId,
        executedAt,
        totalAmountUsd,
        type,
      },
    };
  }

  return {
    isValid: true,
    transaction: {
      coinId,
      executedAt,
      quantity,
      type,
    },
  };
}

async function calculateCoinHoldings(userId: string, coinId: string) {
  const transactions = await PortfolioTransactionModel.find({
    coinId,
    userId,
  });

  return transactions.reduce((holdings, transaction) => {
    if (transaction.type === "buy") {
      return holdings + transaction.quantity;
    }

    return holdings - transaction.quantity;
  }, 0);
}

function getSignedQuantity(transaction: {
  quantity: number;
  type: "buy" | "sell";
}) {
  return transaction.type === "buy" ? transaction.quantity : -transaction.quantity;
}

function formatPortfolioTransaction(transaction: {
  _id: { toString: () => string };
  coinId: string;
  executedAt: Date;
  historicalPriceUsd: number;
  quantity: number;
  totalAmountUsd: number;
  type: "buy" | "sell";
}) {
  return {
    id: transaction._id.toString(),
    coinId: transaction.coinId,
    executedAt: transaction.executedAt,
    historicalPriceUsd: transaction.historicalPriceUsd,
    quantity: transaction.quantity,
    totalAmountUsd: transaction.totalAmountUsd,
    type: transaction.type,
  };
}

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = getSessionFromToken(sessionToken);

  if (!sessionUser) {
    return NextResponse.json(
      {
        message: "Voce precisa estar logado para acessar transacoes.",
      },
      {
        status: 401,
      },
    );
  }

  const coinId = request.nextUrl.searchParams.get("coinId")?.trim() ?? "";

  if (!coinId) {
    return NextResponse.json(
      {
        message: "Informe a moeda que deseja consultar.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    await connectMongoDB();

    const portfolioCoin = await PortfolioCoinModel.findOne({
      coinId,
      userId: sessionUser.id,
    });

    if (!portfolioCoin) {
      return NextResponse.json(
        {
          message: "Moeda nao encontrada no seu portfolio.",
        },
        {
          status: 404,
        },
      );
    }

    const transactions = await PortfolioTransactionModel.find({
      coinId,
      userId: sessionUser.id,
    }).sort({
      executedAt: -1,
      createdAt: -1,
    });

    return NextResponse.json({
      coin: {
        id: portfolioCoin.coinId,
        logoUrl: portfolioCoin.logoUrl ?? null,
        name: portfolioCoin.name,
        symbol: portfolioCoin.symbol,
      },
      data: transactions.map((transaction) => ({
        ...formatPortfolioTransaction(transaction),
      })),
    });
  } catch (error) {
    console.error("Erro ao carregar transacoes do portfolio:", error);

    return NextResponse.json(
      {
        message: "Nao foi possivel carregar as transacoes do portfolio.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = getSessionFromToken(sessionToken);

  if (!sessionUser) {
    return NextResponse.json(
      {
        message: "Voce precisa estar logado para editar transacoes.",
      },
      {
        status: 401,
      },
    );
  }

  let body: PortfolioTransactionRequestBody;

  try {
    body = (await request.json()) as PortfolioTransactionRequestBody;
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

  const transactionId = typeof body.id === "string" ? body.id.trim() : "";
  const validation = validateTransactionBody(body);

  if (!transactionId) {
    return NextResponse.json(
      {
        message: "Informe a transacao que deseja editar.",
      },
      {
        status: 400,
      },
    );
  }

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

    const existingTransaction = await PortfolioTransactionModel.findOne({
      _id: transactionId,
      userId: sessionUser.id,
    });

    if (!existingTransaction) {
      return NextResponse.json(
        {
          message: "Transacao nao encontrada.",
        },
        {
          status: 404,
        },
      );
    }

    if (existingTransaction.coinId !== validation.transaction.coinId) {
      return NextResponse.json(
        {
          message: "Nao e possivel alterar a moeda da transacao.",
        },
        {
          status: 400,
        },
      );
    }

    if (existingTransaction.type !== validation.transaction.type) {
      return NextResponse.json(
        {
          message: "Nao e possivel alterar o tipo da transacao.",
        },
        {
          status: 400,
        },
      );
    }

    const historicalPriceUsd =
      validation.transaction.type === "buy"
        ? await getHistoricalCoinPrice(
            validation.transaction.coinId,
            validation.transaction.executedAt,
          )
        : 0;
    const quantity =
      validation.transaction.type === "buy"
        ? validation.transaction.totalAmountUsd / historicalPriceUsd
        : validation.transaction.quantity;
    const totalAmountUsd =
      validation.transaction.type === "buy"
        ? validation.transaction.totalAmountUsd
        : 0;
    const currentHoldings = await calculateCoinHoldings(
      sessionUser.id,
      validation.transaction.coinId,
    );
    const projectedHoldings =
      currentHoldings -
      getSignedQuantity(existingTransaction) +
      getSignedQuantity({
        quantity,
        type: validation.transaction.type,
      });

    if (projectedHoldings < 0) {
      return NextResponse.json(
        {
          message: "Esta alteracao deixaria seu saldo negativo.",
        },
        {
          status: 400,
        },
      );
    }

    existingTransaction.executedAt = validation.transaction.executedAt;
    existingTransaction.historicalPriceUsd = historicalPriceUsd;
    existingTransaction.quantity = quantity;
    existingTransaction.totalAmountUsd = totalAmountUsd;
    existingTransaction.type = validation.transaction.type;

    await existingTransaction.save();

    return NextResponse.json({
      coinId: validation.transaction.coinId,
      holdings: projectedHoldings,
      message: "Transacao editada com sucesso.",
      transaction: formatPortfolioTransaction(existingTransaction),
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

    console.error("Erro ao editar transacao do portfolio:", error);

    return NextResponse.json(
      {
        message: "Nao foi possivel editar a transacao.",
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
        message: "Voce precisa estar logado para excluir transacoes.",
      },
      {
        status: 401,
      },
    );
  }

  let body: DeletePortfolioTransactionRequestBody;

  try {
    body = (await request.json()) as DeletePortfolioTransactionRequestBody;
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

  const transactionId = typeof body.id === "string" ? body.id.trim() : "";

  if (!transactionId) {
    return NextResponse.json(
      {
        message: "Informe a transacao que deseja excluir.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    await connectMongoDB();

    const transaction = await PortfolioTransactionModel.findOne({
      _id: transactionId,
      userId: sessionUser.id,
    });

    if (!transaction) {
      return NextResponse.json(
        {
          message: "Transacao nao encontrada.",
        },
        {
          status: 404,
        },
      );
    }

    const currentHoldings = await calculateCoinHoldings(
      sessionUser.id,
      transaction.coinId,
    );
    const projectedHoldings =
      currentHoldings - getSignedQuantity(transaction);

    if (projectedHoldings < 0) {
      return NextResponse.json(
        {
          message: "Esta exclusao deixaria seu saldo negativo.",
        },
        {
          status: 400,
        },
      );
    }

    await transaction.deleteOne();

    return NextResponse.json({
      coinId: transaction.coinId,
      holdings: projectedHoldings,
      message: "Transacao excluida com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir transacao do portfolio:", error);

    return NextResponse.json(
      {
        message: "Nao foi possivel excluir a transacao.",
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
        message: "Voce precisa estar logado para adicionar transacoes.",
      },
      {
        status: 401,
      },
    );
  }

  let body: PortfolioTransactionRequestBody;

  try {
    body = (await request.json()) as PortfolioTransactionRequestBody;
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

  const validation = validateTransactionBody(body);

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

    const portfolioCoin = await PortfolioCoinModel.findOne({
      coinId: validation.transaction.coinId,
      userId: sessionUser.id,
    });

    if (!portfolioCoin) {
      return NextResponse.json(
        {
          message: "Moeda nao encontrada no seu portfolio.",
        },
        {
          status: 404,
        },
      );
    }

    const currentHoldings = await calculateCoinHoldings(
      sessionUser.id,
      validation.transaction.coinId,
    );

    if (
      validation.transaction.type === "sell" &&
      validation.transaction.quantity > currentHoldings
    ) {
      return NextResponse.json(
        {
          message: "A quantidade vendida nao pode ser maior que seu saldo.",
        },
        {
          status: 400,
        },
      );
    }

    const historicalPriceUsd =
      validation.transaction.type === "buy"
        ? await getHistoricalCoinPrice(
            validation.transaction.coinId,
            validation.transaction.executedAt,
          )
        : 0;
    const quantity =
      validation.transaction.type === "buy"
        ? validation.transaction.totalAmountUsd / historicalPriceUsd
        : validation.transaction.quantity;
    const totalAmountUsd =
      validation.transaction.type === "buy"
        ? validation.transaction.totalAmountUsd
        : 0;

    const transaction = await PortfolioTransactionModel.create({
      coinId: validation.transaction.coinId,
      executedAt: validation.transaction.executedAt,
      historicalPriceUsd,
      quantity,
      totalAmountUsd,
      type: validation.transaction.type,
      userId: sessionUser.id,
    });
    const holdings = await calculateCoinHoldings(
      sessionUser.id,
      validation.transaction.coinId,
    );

    return NextResponse.json(
      {
        coinId: validation.transaction.coinId,
        holdings,
        message: "Transacao adicionada ao portfolio.",
        transaction: {
          id: transaction._id.toString(),
          coinId: transaction.coinId,
          executedAt: transaction.executedAt,
          historicalPriceUsd: transaction.historicalPriceUsd,
          quantity: transaction.quantity,
          totalAmountUsd: transaction.totalAmountUsd,
          type: transaction.type,
        },
      },
      {
        status: 201,
      },
    );
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

    console.error("Erro ao adicionar transacao ao portfolio:", error);

    return NextResponse.json(
      {
        message: "Nao foi possivel adicionar a transacao ao portfolio.",
      },
      {
        status: 500,
      },
    );
  }
}
