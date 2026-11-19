declare global {
  interface Window {
    appConfig?: { hubUrl: string }
  }
}

const FALLBACK_HUB_URL = "http://localhost:5231/hubs/dashboard"

export function getHubUrl(): string {
  return window.appConfig?.hubUrl ?? import.meta.env.VITE_HUB_URL ?? FALLBACK_HUB_URL
}

export function getApiUrl(path: string): string {
  if (!window.appConfig) return path
  return new URL(path, getHubUrl()).toString()
}

export {}
