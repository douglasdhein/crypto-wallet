import { NextRequest, NextResponse } from "next/server";
import { getSessionFromToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/db/mongodb";
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
        message: "Voce precisa estar logado para deletar a conta.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    await connectMongoDB();

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
        message: "Nao foi possivel deletar a conta.",
      },
      {
        status: 500,
      },
    );
  }
}
