const DEFAULT_USER_AGENT =
  "SciResearchSystem/1.0 (academic-multi-agent-research; mailto:contact@sciresearch.org)";

export async function fetchProviderResponse(
  url,
  { provider, headers = {}, timeoutMs = 20_000 } = {},
) {
  let response;

  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        ...headers,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const reason =
      error.name === "TimeoutError" || error.name === "AbortError"
        ? "request timed out"
        : "network request failed";

    throw new Error(`${provider} ${reason}`, { cause: error });
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(
        `${provider} rate-limited (HTTP 429). An API key in SEMANTIC_SCHOLAR_API_KEY is required for dedicated rate limits.`,
      );
    }
    throw new Error(`${provider} returned HTTP ${response.status}`);
  }

  return response;
}
