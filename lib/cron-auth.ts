function parseBearerToken(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.toLowerCase().startsWith("bearer ")) return null;
  const token = trimmed.slice(7).trim();
  return token.length > 0 ? token : null;
}

function configuredCronSecrets(): string[] {
  const raw = process.env.CRON_SECRETS ?? process.env.CRON_SECRET ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isCronAuthorized(request: Request): boolean {
  const secrets = configuredCronSecrets();
  if (secrets.length === 0) return false;

  const authHeaderToken = parseBearerToken(request.headers.get("authorization"));
  const cronHeaderToken = request.headers.get("x-cron-secret")?.trim() || null;
  const provided = authHeaderToken ?? cronHeaderToken;

  if (!provided) return false;
  return secrets.includes(provided);
}

export function getCronSecretForInternalCall(request: Request): string | null {
  const authHeaderToken = parseBearerToken(request.headers.get("authorization"));
  if (authHeaderToken) return authHeaderToken;

  const cronHeaderToken = request.headers.get("x-cron-secret")?.trim();
  if (cronHeaderToken) return cronHeaderToken;

  const secrets = configuredCronSecrets();
  return secrets[0] ?? null;
}