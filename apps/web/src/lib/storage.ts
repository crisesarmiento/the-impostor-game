const CLIENT_ID_KEY = "impostor_client_id";
const NICKNAME_KEY = "impostor_nickname";
const RECONNECT_KEY = "impostor_reconnect_token";
const PASSWORD_KEY = "impostor_room_password";

export function getClientId(): string {
  const existing = localStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;
  const id = `client-${crypto.randomUUID()}`;
  localStorage.setItem(CLIENT_ID_KEY, id);
  return id;
}

export function setNickname(nickname: string) {
  localStorage.setItem(NICKNAME_KEY, nickname);
}

export function getNickname(): string | null {
  return localStorage.getItem(NICKNAME_KEY);
}

export function setReconnectToken(token?: string) {
  if (!token) return;
  localStorage.setItem(RECONNECT_KEY, token);
}

export function getReconnectToken(): string | null {
  return localStorage.getItem(RECONNECT_KEY);
}

export function setRoomPassword(password: string) {
  localStorage.setItem(PASSWORD_KEY, password);
}

export function getRoomPassword(): string | null {
  return localStorage.getItem(PASSWORD_KEY);
}
