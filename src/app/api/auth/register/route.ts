import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/db/mongodb";
import { UserModel } from "@/models/User";

type RegisterRequestBody = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
};

type RegisterValidationResult =
  | {
      isValid: true;
      data: {
        name: string;
        email: string;
        password: string;
      };
    }
  | {
      isValid: false;
      errors: Record<string, string>;
    };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export const runtime = "nodejs";

function validateRegisterBody(
  body: RegisterRequestBody,
): RegisterValidationResult {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const errors: Record<string, string> = {};

  if (name.length < 2) {
    errors.name = "Informe um nome com pelo menos 2 caracteres.";
  }

  if (!EMAIL_REGEX.test(email)) {
    errors.email = "Informe um email valido.";
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = "A senha deve ter pelo menos 8 caracteres.";
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
      name,
      email,
      password,
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

function isMongoDBConnectionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("querySrv") ||
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("IP that isn't whitelisted") ||
    error.message.includes("Could not connect to any servers")
  );
}

export async function POST(request: Request) {
  let body: RegisterRequestBody;

  try {
    body = (await request.json()) as RegisterRequestBody;
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

  const validation = validateRegisterBody(body);

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

    const existingUser = await UserModel.exists({
      email: validation.data.email,
    });

    if (existingUser) {
      return NextResponse.json(
        {
          message: "Ja existe um usuario cadastrado com este email.",
        },
        {
          status: 409,
        },
      );
    }

    const passwordHash = await hash(validation.data.password, 12);

    const user = await UserModel.create({
      name: validation.data.name,
      email: validation.data.email,
      passwordHash,
    });

    return NextResponse.json(
      {
        message: "Usuario cadastrado com sucesso.",
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        {
          message: "Ja existe um usuario cadastrado com este email.",
        },
        {
          status: 409,
        },
      );
    }

    if (isMongoDBConnectionError(error)) {
      console.error("Erro de conexao com MongoDB:", error);

      return NextResponse.json(
        {
          message:
            "Nao foi possivel conectar ao MongoDB. Verifique a URI e o Network Access no MongoDB Atlas.",
        },
        {
          status: 503,
        },
      );
    }

    console.error("Erro ao cadastrar usuario:", error);

    return NextResponse.json(
      {
        message: "Nao foi possivel cadastrar o usuario.",
      },
      {
        status: 500,
      },
    );
  }
}
