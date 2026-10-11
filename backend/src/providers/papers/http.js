export async function fetchProviderResponse(
  url,
  { provider, headers = {}, timeoutMs = 10_000 } = {},
) {
  let response;

  try {
    response = await fetch(url, {
      headers,
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
    throw new Error(`${provider} returned HTTP ${response.status}`);
  }

  return response;
}
