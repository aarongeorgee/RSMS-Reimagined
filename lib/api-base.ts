export function getApiBase() {
  const configured = process.env.NEXT_PUBLIC_API_URL
  if (configured) return configured.replace(/\/$/, '')
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost'
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
    return `${protocol}//${host}:5001/api`
  }
  return 'http://localhost:5001/api'
}
