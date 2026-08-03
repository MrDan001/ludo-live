"use client";

import { create } from "zustand";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthStore {
  user: User | null;
  dbUserId: string | null;
  avatarUrl: string | null;
  coins: number;
  gems: number;
  loading: boolean;
  refreshWallet: () => Promise<void>;
  checkSession: () => Promise<void>;
  signInAsGuest: () => Promise<{ error: string | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

async function syncUser(
  user: User
): Promise<{ id: string; coins: number; gems: number; avatarUrl: string | null } | null> {
  try {
    const res = await fetch("/api/auth/sync-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supabaseId: user.id,
        name: user.email || "Guest Player",
        email: user.email,
        isGuest: user.is_anonymous ?? false,
      }),
    });
    const data = await res.json();
    return data.id
      ? { id: data.id, coins: data.coins ?? 0, gems: data.gems ?? 0, avatarUrl: data.avatarUrl ?? null }
      : null;
  } catch {
    return null;
  }
}

export const useAuth = create<AuthStore>((set, get) => ({
  user: null,
  dbUserId: null,
  avatarUrl: null,
  coins: 0,
  gems: 0,
  loading: true,

  checkSession: async () => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user ?? null;
    set({ user, loading: false });
    if (user) {
      const synced = await syncUser(user);
      if (synced) set({ dbUserId: synced.id, coins: synced.coins, gems: synced.gems, avatarUrl: synced.avatarUrl });
    }
  },

  refreshWallet: async () => {
    const { user } = get();
    if (!user) return;
    const synced = await syncUser(user);
    if (synced) set({ coins: synced.coins, gems: synced.gems, avatarUrl: synced.avatarUrl });
  },

  signInAsGuest: async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) return { error: error.message };
    set({ user: data.user });
    if (data.user) {
      const synced = await syncUser(data.user);
      if (synced) set({ dbUserId: synced.id, coins: synced.coins, gems: synced.gems, avatarUrl: synced.avatarUrl });
    }
    return { error: null };
  },

  signInWithEmail: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    set({ user: data.user });
    if (data.user) {
      const synced = await syncUser(data.user);
      if (synced) set({ dbUserId: synced.id, coins: synced.coins, gems: synced.gems, avatarUrl: synced.avatarUrl });
    }
    return { error: null };
  },

  signUpWithEmail: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    set({ user: data.user });
    if (data.user) {
      const synced = await syncUser(data.user);
      if (synced) set({ dbUserId: synced.id, coins: synced.coins, gems: synced.gems, avatarUrl: synced.avatarUrl });
    }
    return { error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, dbUserId: null, avatarUrl: null, coins: 0, gems: 0 });
  },
}));