import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      login: ({ user, token }) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      updateUser: (patch) =>
        set(state => ({
          user: state.user ? { ...state.user, ...patch } : state.user,
        })),
      hasRole: (...roles) => {
        const { user } = get();
        return user ? roles.includes(user.rol.nombre) : false;
      },
    }),
    { name: 'taller-auth' }
  )
);