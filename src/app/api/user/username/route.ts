import { NextRequest, NextResponse } from "next/server";
import { getSessionFromToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/db/mongodb";
import { UserModel } from "@/models/User";

type UpdateUsernameRequestBody = {
  username?: unknown;
};

type UsernameValidationResult =
  | {
      isValid: true;
      username: string;
    }
  | {
      isValid: false;
      message: string;
    };

const USERNAME_REGEX = /^[a-z0-9_]+$/;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 30;

export const runtime = "nodejs";

function validateUsernameBody(
  body: UpdateUsernameRequestBody,
): UsernameValidationResult {
  const username =
    typeof body.username === "string"
      ? body.username.trim().toLowerCase()
      : "";

  if (
    username.length < MIN_USERNAME_LENGTH ||
    username.length > MAX_USERNAME_LENGTH ||
    !USERNAME_REGEX.test(username)
  ) {
    return {
      isValid: false,
      message:
        "Informe um username de 3 a 30 caracteres usando letras, numeros ou underline.",
    };
  }

  return {
    isValid: true,
    username,
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

export async function PATCH(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = getSessionFromToken(sessionToken);

  if (!sessionUser) {
    return NextResponse.json(
      {
        message: "Voce precisa estar logado para alterar o username.",
      },
      {
        status: 401,
      },
    );
  }

  let body: UpdateUsernameRequestBody;

  try {
    body = (await request.json()) as UpdateUsernameRequestBody;
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

  const validation = validateUsernameBody(body);

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

    const existingUser = await UserModel.findOne({
      _id: {
        $ne: sessionUser.id,
      },
      username: validation.username,
    });

    if (existingUser) {
      return NextResponse.json(
        {
          message: "Ja existe um usuario cadastrado com este username.",
        },
        {
          status: 409,
        },
      );
    }

    const user = await UserModel.findByIdAndUpdate(
      sessionUser.id,
      {
        username: validation.username,
      },
      {
        new: true,
        runValidators: true,
      },
    );

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
      message: "Username salvo com sucesso.",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        {
          message: "Ja existe um usuario cadastrado com este username.",
        },
        {
          status: 409,
        },
      );
    }

    console.error("Erro ao alterar username:", error);

    return NextResponse.json(
      {
        message: "Nao foi possivel alterar o username.",
      },
      {
        status: 500,
      },
    );
  }
}
