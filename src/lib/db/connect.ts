import "server-only";

import mongoose from "mongoose";
import {
  getMongoUri,
  isMongoConfigured,
  redactMongoUri,
  requireMongoUri,
  sanitizeDbError,
} from "@/lib/db/config";

export type MongoConnectionState =
  | "disconnected"
  | "connected"
  | "connecting"
  | "disconnecting"
  | "uninitialized";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  __wayfleetMongoose?: MongooseCache;
};

const cache: MongooseCache = globalForMongoose.__wayfleetMongoose ?? {
  conn: null,
  promise: null,
};

globalForMongoose.__wayfleetMongoose = cache;

const READY_STATE: Record<number, MongoConnectionState> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
  99: "uninitialized",
};

export function getMongoConnectionState(): MongoConnectionState {
  return READY_STATE[mongoose.connection.readyState] ?? "uninitialized";
}

export async function connectDb(): Promise<typeof mongoose> {
  if (cache.conn) {
    return cache.conn;
  }

  const uri = requireMongoUri();

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      })
      .then((instance) => instance);
  }

  try {
    cache.conn = await cache.promise;
    return cache.conn;
  } catch (error: unknown) {
    cache.promise = null;
    cache.conn = null;
    console.error("MongoDB connection failed", {
      uri: redactMongoUri(uri),
      message: sanitizeDbError(error),
    });
    throw new Error("MongoDB connection failed");
  }
}

export async function pingMongo(): Promise<boolean> {
  const db = mongoose.connection.db;
  if (!db) {
    return false;
  }

  await db.admin().command({ ping: 1 });
  return true;
}

export function resetMongoConnectionCache(): void {
  cache.conn = null;
  cache.promise = null;
}

export { getMongoUri, isMongoConfigured, redactMongoUri, sanitizeDbError };
