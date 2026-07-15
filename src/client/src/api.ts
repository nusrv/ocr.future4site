export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { credentials: 'include', ...options, headers: options.body instanceof FormData ? options.headers : { 'content-type': 'application/json', ...options.headers } });
  if (response.status === 204) return undefined as T;
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? 'Request failed');
  return body;
}
