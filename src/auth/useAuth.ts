import { useContext } from 'react';
import { AuthContext } from './AuthProvider';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth вызван вне AuthProvider');
  return ctx;
}

// Для приватных страниц: профиль гарантированно есть (PrivateRoute не пустит без него)
export function useProfile() {
  const { profile } = useAuth();
  if (!profile) throw new Error('Профиль не загружен');
  return profile;
}
