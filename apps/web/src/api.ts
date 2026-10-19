import { useEffect, useState } from 'react'
const BASE: string = (import.meta as any).env?.VITE_API_URL ?? ''
let csrf = ''
export const asset = (u?: string | null) => (u ? (u.startsWith('/') ? BASE + u : u) : '')

export async function api<T = any>(path: string, o: { method?: string; body?: any } = {}): Promise<T> {
  const method = o.method ?? 'GET'
  const headers: Record<string, string> = {}
  if (method !== 'GET') {
    if (!csrf) csrf = (await (await fetch(`${BASE}/api/auth/csrf`, { credentials: 'include' })).json()).csrfToken
    headers['x-csrf-token'] = csrf
  }
  const form = o.body instanceof FormData
  if (o.body && !form) headers['content-type'] = 'application/json'
  const r = await fetch(`${BASE}/api${path}`, { method, credentials: 'include', headers, body: o.body ? (form ? o.body : JSON.stringify(o.body)) : undefined })
  if (r.status === 403 && method !== 'GET') csrf = '' // minta token baru pada percobaan berikutnya
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `Error ${r.status}`)
  return r.status === 204 ? (undefined as T) : r.json()
}
export function useApi<T>(path: string, init: T): [T, boolean] {
  const [d, setD] = useState<T>(init); const [loading, setL] = useState(true)
  useEffect(() => { api<T>(path).then(setD).catch(() => {}).finally(() => setL(false)) }, [path])
  return [d, loading]
}
