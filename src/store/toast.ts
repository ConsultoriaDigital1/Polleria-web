"use client";

import { create } from "zustand";

export interface Toast {
  id: number;
  message: string;
  leaving: boolean;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string) => void;
  dismiss: (id: number) => void;
}

const DURATION = 5000;
const EXIT_MS = 300;
let nextId = 0;

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message) => {
    const id = ++nextId;
    set((s) => ({ toasts: [...s.toasts, { id, message, leaving: false }] }));
    setTimeout(() => get().dismiss(id), DURATION);
  },
  dismiss: (id) => {
    // Marca el toast como saliente para reproducir el slide antes de quitarlo
    set((s) => ({
      toasts: s.toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
    }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, EXIT_MS);
  },
}));
