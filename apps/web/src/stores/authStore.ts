import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserWithProfile, AuthSession } from '@/types/user';

interface AuthState {
  user: UserWithProfile | null;
  session: AuthSession | null;
  setUser: (user: UserWithProfile | null) => void;
  setSession: (session: AuthSession | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      user: null,
      session: null,
      setUser: user => set({ user }),
      setSession: session => set({ session }),
      clearAuth: () => set({ user: null, session: null }),
    }),
    {
      name: 'auth-storage',
      partialize: state => ({ session: state.session }), // Only persist session
    }
  )
);
