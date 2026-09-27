export interface UserSession {
  id: string;
  username: string;
}

export interface UserRecord extends UserSession {
  password_hash: string;
  created_at: string;
}

const USERS_STORAGE_KEY = "summify_auth_users";
const SESSION_STORAGE_KEY = "summify_auth_session";

type AuthListener = (user: UserSession | null) => void;
const listeners: Set<AuthListener> = new Set();

export function subscribeAuth(listener: AuthListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  const currentUser = getCurrentUser();
  listeners.forEach((fn) => fn(currentUser));
}

// Password hashing utility using native browser Web Crypto API
async function hashPassword(password: string, salt: string = "summify_salt_v1"): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Retrieve registered users from localStorage
function getUsers(): UserRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Save registered users list
function saveUsers(users: UserRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

// Get active logged in user session
export function getCurrentUser(): UserSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Register a new user (Username + Password only, NO Email)
export async function registerUser(usernameInput: string, passwordInput: string): Promise<UserSession> {
  const username = usernameInput.trim();
  const password = passwordInput.trim();

  if (!username || username.length < 3) {
    throw new Error("Username must be at least 3 characters long.");
  }
  if (!password || password.length < 4) {
    throw new Error("Password must be at least 4 characters long.");
  }

  const users = getUsers();
  const existing = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (existing) {
    throw new Error(`Username "${username}" is already taken. Please choose another.`);
  }

  const password_hash = await hashPassword(password);
  const newUser: UserRecord = {
    id: "usr_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
    username,
    password_hash,
    created_at: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  // Set session
  const session: UserSession = { id: newUser.id, username: newUser.username };
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  notifyListeners();

  return session;
}

// Login existing user
export async function loginUser(usernameInput: string, passwordInput: string): Promise<UserSession> {
  const username = usernameInput.trim();
  const password = passwordInput.trim();

  if (!username || !password) {
    throw new Error("Please enter both username and password.");
  }

  const users = getUsers();
  const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!user) {
    throw new Error("User not found. Please check your username or Sign Up.");
  }

  const hash = await hashPassword(password);
  if (hash !== user.password_hash) {
    throw new Error("Incorrect password. Please try again.");
  }

  const session: UserSession = { id: user.id, username: user.username };
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  notifyListeners();

  return session;
}

// Logout user
export function logoutUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_STORAGE_KEY);
  notifyListeners();
}
