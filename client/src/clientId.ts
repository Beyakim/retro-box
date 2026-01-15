const CLIENT_ID_KEY = "retro-box-client-id";

function generateClientId(): string {
  return `client-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function getClientId(): string {
  let clientId = localStorage.getItem(CLIENT_ID_KEY);

  if (!clientId) {
    clientId = generateClientId();
    localStorage.setItem(CLIENT_ID_KEY, clientId);
    console.log("🆔 Generated new clientId:", clientId);
  }

  return clientId;
}
