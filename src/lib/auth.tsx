/**
 * Google Identity Services (GIS) auth context.
 *
 * Flow: GIS returns a Google ID token in the browser -> we POST it to
 * /api/auth/login, which verifies it server-side and sets an HttpOnly session
 * cookie. Subsequent requests are authenticated by that cookie. No client
 * secret is involved.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { GOOGLE_CLIENT_ID } from './config';

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

type ButtonTheme = 'outline' | 'filled_black';

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean; // GIS script loaded + initialized
  loading: boolean; // initial session check in progress
  renderButton: (el: HTMLElement, theme: ButtonTheme) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

declare global {
  interface Window {
    google?: any;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  const handleCredential = useCallback(async (response: { credential?: string }) => {
    if (!response?.credential) return;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential: response.credential }),
      });
      if (res.ok) {
        setUser((await res.json()) as AuthUser);
      } else {
        console.error('Login rejected:', res.status);
      }
    } catch (err) {
      console.error('Login request failed:', err);
    }
  }, []);

  // Initialize GIS once its script has loaded.
  useEffect(() => {
    let cancelled = false;
    const tryInit = () => {
      if (cancelled) return;
      const g = window.google;
      if (g?.accounts?.id) {
        if (!initialized.current) {
          g.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredential,
            auto_select: false,
            cancel_on_tap_outside: true,
          });
          initialized.current = true;
        }
        setReady(true);
      } else {
        setTimeout(tryInit, 200);
      }
    };
    tryInit();
    return () => {
      cancelled = true;
    };
  }, [handleCredential]);

  // Restore an existing session (cookie) on first load.
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (u?.sub) setUser(u as AuthUser);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const renderButton = useCallback((el: HTMLElement, theme: ButtonTheme) => {
    const g = window.google;
    if (!g?.accounts?.id) return;
    el.innerHTML = '';
    g.accounts.id.renderButton(el, {
      type: 'standard',
      theme,
      size: 'large',
      shape: 'pill',
      text: 'signin_with',
      logo_alignment: 'left',
    });
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore network errors on logout
    }
    window.google?.accounts?.id?.disableAutoSelect?.();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, loading, renderButton, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
