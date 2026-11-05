import { useContext } from 'react';
import { AuthContext } from './AuthProvider';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth вызван вне AuthProvider');
  return ctx;
}

export function useProfile() {
  const { profile } = useAuth();
  if (!profile) throw new Error('Профиль не загружен');
  return profile;
}
