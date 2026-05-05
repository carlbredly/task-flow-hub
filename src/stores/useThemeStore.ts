import { create } from "zustand";

type Theme = "light" | "dark";

const STORAGE_KEY = "trackm-theme";

const getInitial = (): Theme => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {}
  return "light";
};

const apply = (t: Theme) => document.documentElement.classList.toggle("dark", t === "dark");

// Apply on module load
apply(getInitial());

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitial(),
  toggle: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    apply(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    set({ theme: next });
  },
}));
