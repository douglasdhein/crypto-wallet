import { NextRequest, NextResponse } from "next/server";
import { getSessionFromToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/db/mongodb";
import { PortfolioCoinModel } from "@/models/PortfolioCoin";
import { PortfolioTransactionModel } from "@/models/PortfolioTransaction";
import { UserModel } from "@/models/User";

export const runtime = "nodejs";

function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function DELETE(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = getSessionFromToken(sessionToken);

  if (!sessionUser) {
    return NextResponse.json(
      {
        message: "Você precisa estar logado para deletar a conta.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    await connectMongoDB();

    await PortfolioCoinModel.deleteMany({
      userId: sessionUser.id,
    });
    await PortfolioTransactionModel.deleteMany({
      userId: sessionUser.id,
    });
    await UserModel.findByIdAndDelete(sessionUser.id);

    const response = NextResponse.json({
      message: "Conta deletada com sucesso.",
    });

    clearSessionCookie(response);

    return response;
  } catch (error) {
    console.error("Erro ao deletar conta:", error);

    return NextResponse.json(
      {
        message: "Não foi possível deletar a conta.",
      },
      {
        status: 500,
      },
    );
  }
}
