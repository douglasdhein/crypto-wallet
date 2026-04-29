import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/db/mongodb";
import { UserModel } from "@/models/User";

type LoginRequestBody = {
  identifier?: unknown;
  email?: unknown;
  password?: unknown;
};

type LoginValidationResult =
  | {
      isValid: true;
      data: {
        identifier: string;
        isEmailLogin: boolean;
        password: string;
      };
    }
  | {
      isValid: false;
      errors: Record<string, string>;
    };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-z0-9_]+$/;

export const runtime = "nodejs";

function validateLoginBody(body: LoginRequestBody): LoginValidationResult {
  const rawIdentifier =
    typeof body.identifier === "string" ? body.identifier : body.email;
  const identifier =
    typeof rawIdentifier === "string" ? rawIdentifier.trim().toLowerCase() : "";
  const isEmailLogin = EMAIL_REGEX.test(identifier);
  const password = typeof body.password === "string" ? body.password : "";
  const errors: Record<string, string> = {};

  if (!identifier) {
    errors.identifier = "Informe seu email ou username.";
  } else if (!isEmailLogin && !USERNAME_REGEX.test(identifier)) {
    errors.identifier = "Informe um email ou username válido.";
  }

  if (!password) {
    errors.password = "Informe sua senha.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      isValid: false,
      errors,
    };
  }

  return {
    isValid: true,
    data: {
      identifier,
      isEmailLogin,
      password,
    },
  };
}

function getInvalidCredentialsResponse() {
  return NextResponse.json(
    {
      message: "Dados inválidos.",
    },
    {
      status: 401,
    },
  );
}

export async function POST(request: Request) {
  let body: LoginRequestBody;

  try {
    body = (await request.json()) as LoginRequestBody;
  } catch {
    return NextResponse.json(
      {
        message: "Envie um corpo JSON válido.",
      },
      {
        status: 400,
      },
    );
  }

  const validation = validateLoginBody(body);

  if (!validation.isValid) {
    return NextResponse.json(
      {
        message: "Dados inválidos.",
        errors: validation.errors,
      },
      {
        status: 400,
      },
    );
  }

  try {
    await connectMongoDB();

    const user = await UserModel.findOne(
      validation.data.isEmailLogin
        ? {
            email: validation.data.identifier,
          }
        : {
            username: validation.data.identifier,
          },
    ).select("+passwordHash");

    if (!user) {
      return getInvalidCredentialsResponse();
    }

    const isPasswordValid = await compare(
      validation.data.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      return getInvalidCredentialsResponse();
    }

    const sessionUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      username: user.username,
    };
    const sessionToken = createSessionToken(sessionUser);

    const response = NextResponse.json({
      message: "Login realizado com sucesso.",
      user: sessionUser,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("Erro ao realizar login:", error);

    return NextResponse.json(
      {
        message: "Não foi possível realizar o login.",
      },
      {
        status: 500,
      },
    );
  }
}
