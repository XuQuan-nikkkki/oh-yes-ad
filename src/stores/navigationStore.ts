import { create } from "zustand";

type NavigationStore = {
  navigating: boolean;
  setNavigating: (value: boolean) => void;
};

export const useNavigationStore = create<NavigationStore>((set) => ({
  navigating: false,
  setNavigating: (value) => set({ navigating: value }),
}));
