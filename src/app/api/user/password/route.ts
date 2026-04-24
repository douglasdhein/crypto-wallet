import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/db/mongodb";
import { UserModel } from "@/models/User";

type UpdatePasswordRequestBody = {
  password?: unknown;
};

type PasswordValidationResult =
  | {
      isValid: true;
      password: string;
    }
  | {
      isValid: false;
      message: string;
    };

const MIN_PASSWORD_LENGTH = 8;

export const runtime = "nodejs";

function validatePasswordBody(
  body: UpdatePasswordRequestBody,
): PasswordValidationResult {
  const password = typeof body.password === "string" ? body.password : "";

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      isValid: false,
      message: "A nova senha deve ter pelo menos 8 caracteres.",
    };
  }

  return {
    isValid: true,
    password,
  };
}

export async function PATCH(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = getSessionFromToken(sessionToken);

  if (!sessionUser) {
    return NextResponse.json(
      {
        message: "Voce precisa estar logado para alterar a senha.",
      },
      {
        status: 401,
      },
    );
  }

  let body: UpdatePasswordRequestBody;

  try {
    body = (await request.json()) as UpdatePasswordRequestBody;
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

  const validation = validatePasswordBody(body);

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

    const passwordHash = await hash(validation.password, 12);
    const user = await UserModel.findByIdAndUpdate(sessionUser.id, {
      passwordHash,
    });

    if (!user) {
      return NextResponse.json(
        {
          message: "Usuario nao encontrado.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      message: "Senha alterada com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao alterar senha:", error);

    return NextResponse.json(
      {
        message: "Nao foi possivel alterar a senha.",
      },
      {
        status: 500,
      },
    );
  }
}
