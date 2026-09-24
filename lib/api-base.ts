const PROD_API = "https://rsms-reimagined.aarongeorge186.workers.dev/api";

export function getApiBase() {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return `http://${host}:5001/api`;
    return PROD_API;
  }
  return PROD_API;
}
