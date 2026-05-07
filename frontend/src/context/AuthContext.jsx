import { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { getMe, logout as apiLogout } from '../services/auth.service.js';

const AuthContext = createContext(null);

const initialState = { user: null, loading: true, error: null };

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER': return { ...state, user: action.payload, loading: false, error: null };
    case 'SET_ERROR': return { ...state, error: action.payload, loading: false };
    case 'SET_LOADING': return { ...state, loading: action.payload };
    case 'LOGOUT': return { user: null, loading: false, error: null };
    default: return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadUser = useCallback(async () => {
    try {
      const user = await getMe();
      dispatch({ type: 'SET_USER', payload: user });
    } catch {
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  useEffect(() => {
    loadUser();

    const handleLogout = () => dispatch({ type: 'LOGOUT' });
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [loadUser]);

  const logout = useCallback(async () => {
    await apiLogout().catch(() => {});
    dispatch({ type: 'LOGOUT' });
  }, []);

  const setUser = useCallback((user) => {
    dispatch({ type: 'SET_USER', payload: user });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, logout, setUser, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
