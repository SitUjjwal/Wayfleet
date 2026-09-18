const MONGODB_URI_ENV = "MONGODB_URI";

export function getMongoUri(): string | undefined {
  const value = process.env[MONGODB_URI_ENV]?.trim();
  return value ? value : undefined;
}

export function isMongoConfigured(): boolean {
  return Boolean(getMongoUri());
}

export function requireMongoUri(): string {
  const uri = getMongoUri();
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  return uri;
}

export function redactMongoUri(uri: string): string {
  return uri.replace(/:\/\/([^:/@]+):([^@]+)@/g, "://$1:***@");
}

export function sanitizeDbError(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Unknown database error";
  return raw.replace(/mongodb(\+srv)?:\/\/\S+/gi, "mongodb://***");
}
