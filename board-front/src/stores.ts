import { create } from "zustand";
import { combine } from "zustand/middleware";

export const useIsOpenStore = create(
  combine(
    { isOpen: { "root.greeting": true } as Record<string, boolean> },
    (set) => ({
      toggleOpen: (key: string) =>
        set((state) => ({
          isOpen: { ...state.isOpen, [key]: !state.isOpen[key] },
        })),
    })
  )
);
