function parseBearerToken(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.toLowerCase().startsWith("bearer ")) return null;
  const token = trimmed.slice(7).trim();
  return token.length > 0 ? token : null;
}

function normalizeCronToken(value: string | null | undefined): string | null {
  if (!value) return null;

  let token = value.trim();
  if (!token) return null;

  // Be lenient with common config mistakes: optional wrapping quotes and
  // accidental duplicated "Bearer " prefix in stored env values.
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }

  if (token.toLowerCase().startsWith("bearer ")) {
    token = token.slice(7).trim();
  }

  return token.length > 0 ? token : null;
}

function configuredCronSecrets(): string[] {
  const sources = [process.env.CRON_SECRETS, process.env.CRON_SECRET];
  const tokens = sources
    .flatMap((value) => (value ?? "").split(/[\n,]/))
    .map((s) => normalizeCronToken(s))
    .filter((s): s is string => s !== null);

  // Keep first-seen order while removing duplicates.
  return [...new Set(tokens)];
}

export function isCronAuthorized(request: Request): boolean {
  const secrets = configuredCronSecrets();
  if (secrets.length === 0) return false;

  const authHeaderToken = parseBearerToken(request.headers.get("authorization"));
  const cronHeaderToken = request.headers.get("x-cron-secret");
  const provided = normalizeCronToken(authHeaderToken ?? cronHeaderToken);

  if (!provided) return false;
  return secrets.includes(provided);
}

export function getCronSecretForInternalCall(request: Request): string | null {
  const authHeaderToken = parseBearerToken(request.headers.get("authorization"));
  const normalizedAuthToken = normalizeCronToken(authHeaderToken);
  if (normalizedAuthToken) return normalizedAuthToken;

  const cronHeaderToken = normalizeCronToken(request.headers.get("x-cron-secret"));
  if (cronHeaderToken) return cronHeaderToken;

  const secrets = configuredCronSecrets();
  return secrets[0] ?? null;
}