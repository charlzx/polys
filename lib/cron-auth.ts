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

function tokenFingerprint(token: string): string {
  // Non-reversible short fingerprint for debugging secret mismatches.
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fp_${(hash >>> 0).toString(16).padStart(8, "0")}_${token.length}`;
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

function providedCronTokens(request: Request): string[] {
  const authHeaderToken = parseBearerToken(request.headers.get("authorization"));
  const cronHeaderToken = request.headers.get("x-cron-secret");

  const provided = [authHeaderToken, cronHeaderToken]
    .map((token) => normalizeCronToken(token))
    .filter((s): s is string => s !== null);

  return [...new Set(provided)];
}

export type CronAuthFailureReason =
  | "no_configured_secrets"
  | "missing_request_secret"
  | "secret_mismatch";

export type CronAuthDebug = {
  authorized: boolean;
  failureReason: CronAuthFailureReason | null;
  configuredSecretCount: number;
  hasAuthorizationHeader: boolean;
  hasCronHeader: boolean;
  providedTokenFingerprints: string[];
  configuredTokenFingerprints: string[];
};

export function getCronAuthDebug(request: Request): CronAuthDebug {
  const secrets = configuredCronSecrets();
  const hasAuthorizationHeader = Boolean(request.headers.get("authorization"));
  const hasCronHeader = Boolean(request.headers.get("x-cron-secret"));

  if (secrets.length === 0) {
    return {
      authorized: false,
      failureReason: "no_configured_secrets",
      configuredSecretCount: 0,
      hasAuthorizationHeader,
      hasCronHeader,
      providedTokenFingerprints: [],
      configuredTokenFingerprints: [],
    };
  }

  const provided = providedCronTokens(request);
  const configuredTokenFingerprints = secrets.map(tokenFingerprint);
  const providedTokenFingerprints = provided.map(tokenFingerprint);

  if (provided.length === 0) {
    return {
      authorized: false,
      failureReason: "missing_request_secret",
      configuredSecretCount: secrets.length,
      hasAuthorizationHeader,
      hasCronHeader,
      providedTokenFingerprints,
      configuredTokenFingerprints,
    };
  }

  const isAuthorized = provided.some((token) => secrets.includes(token));
  if (!isAuthorized) {
    return {
      authorized: false,
      failureReason: "secret_mismatch",
      configuredSecretCount: secrets.length,
      hasAuthorizationHeader,
      hasCronHeader,
      providedTokenFingerprints,
      configuredTokenFingerprints,
    };
  }

  return {
    authorized: true,
    failureReason: null,
    configuredSecretCount: secrets.length,
    hasAuthorizationHeader,
    hasCronHeader,
    providedTokenFingerprints,
    configuredTokenFingerprints,
  };
}

export function isCronAuthorized(request: Request): boolean {
  return getCronAuthDebug(request).authorized;
}

export function getCronSecretForInternalCall(request: Request): string | null {
  const secrets = configuredCronSecrets();
  const provided = providedCronTokens(request);

  // Prefer a provided token that matches configured secrets.
  const matchingProvidedToken = provided.find((token) => secrets.includes(token));
  if (matchingProvidedToken) return matchingProvidedToken;

  // If no match was found, forward any provided token as a fallback.
  if (provided.length > 0) return provided[0];

  return secrets[0] ?? null;
}