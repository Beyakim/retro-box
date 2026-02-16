export function getClientId(): string {
  const key = "retrobox_client_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const id =
    (crypto as any).randomUUID?.() ||
    `cid_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  localStorage.setItem(key, id);
  return id;
}
