import mongoose from "mongoose";

type MongooseConnection = typeof mongoose;

type MongooseCache = {
  connection: MongooseConnection | null;
  promise: Promise<MongooseConnection> | null;
};

type GlobalWithMongoose = typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const globalWithMongoose = globalThis as GlobalWithMongoose;

const cached = globalWithMongoose.mongooseCache ?? {
  connection: null,
  promise: null,
};

globalWithMongoose.mongooseCache = cached;

function getMongoDBUri() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Configure MONGODB_URI no arquivo .env.local.");
  }

  return uri;
}

function getMongoDBName() {
  return process.env.MONGODB_DB_NAME ?? "crypto-wallet-dev";
}

export async function connectMongoDB() {
  if (cached.connection) {
    return cached.connection;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(getMongoDBUri(), {
      bufferCommands: false,
      dbName: getMongoDBName(),
      serverSelectionTimeoutMS: 10000,
    });
  }

  try {
    cached.connection = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.connection;
}
