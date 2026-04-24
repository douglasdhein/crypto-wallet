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
  email?: unknown;
  password?: unknown;
};

type LoginValidationResult =
  | {
      isValid: true;
      data: {
        email: string;
        password: string;
      };
    }
  | {
      isValid: false;
      errors: Record<string, string>;
    };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const runtime = "nodejs";

function validateLoginBody(body: LoginRequestBody): LoginValidationResult {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const errors: Record<string, string> = {};

  if (!EMAIL_REGEX.test(email)) {
    errors.email = "Informe um email valido.";
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
      email,
      password,
    },
  };
}

function getInvalidCredentialsResponse() {
  return NextResponse.json(
    {
      message: "Email ou senha invalidos.",
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
        message: "Envie um corpo JSON valido.",
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
        message: "Dados invalidos.",
        errors: validation.errors,
      },
      {
        status: 400,
      },
    );
  }

  try {
    await connectMongoDB();

    const user = await UserModel.findOne({
      email: validation.data.email,
    }).select("+passwordHash");

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
        message: "Nao foi possivel realizar o login.",
      },
      {
        status: 500,
      },
    );
  }
}
