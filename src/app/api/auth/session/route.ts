import { NextRequest, NextResponse } from "next/server";
import { getSessionFromToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/db/mongodb";
import { UserModel } from "@/models/User";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = getSessionFromToken(sessionToken);

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }

  try {
    await connectMongoDB();

    const currentUser = await UserModel.findById(user.id);

    if (!currentUser) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: currentUser._id.toString(),
        name: currentUser.name,
        email: currentUser.email,
        username: currentUser.username ?? null,
      },
    });
  } catch (error) {
    console.error("Erro ao carregar sessao:", error);

    return NextResponse.json({
      authenticated: true,
      user,
    });
  }
}
