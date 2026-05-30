'use client';

import { createContext, useContext } from 'react';
import { UserRole } from './users';

export interface SessionUser {
  username: string;
  role: UserRole;
}

export const UserContext = createContext<SessionUser | null>(null);

export function useUser(): SessionUser {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside UserContext.Provider');
  return ctx;
}
