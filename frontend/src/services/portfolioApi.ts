// Frontend portfolio API with simple in-memory cache and manual refresh

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api') as string;

let portfolioCache: any = null;

export async function getPortfolioData(opts?: { skip?: number; limit?: number }) {
  if (portfolioCache) return portfolioCache;
  const skip = opts?.skip ?? 0;
  const limit = opts?.limit ?? 1000;
  const url = `${API_BASE}/loans?skip=${skip}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const data = await res.json();
  portfolioCache = data;
  return data;
}

export async function refreshPortfolioData(opts?: { skip?: number; limit?: number }) {
  portfolioCache = null;
  return getPortfolioData(opts);
}
