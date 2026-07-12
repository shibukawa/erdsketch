import { createContext, useContext, type PropsWithChildren } from "react";

const VocabularyNavigationContext = createContext<((matchKey: string) => void) | null>(null);

type VocabularyNavigationProviderProps = PropsWithChildren<{ onOpen: (matchKey: string) => void }>;

export function VocabularyNavigationProvider({ onOpen, children }: VocabularyNavigationProviderProps) {
  return <VocabularyNavigationContext.Provider value={onOpen}>{children}</VocabularyNavigationContext.Provider>;
}

export function useVocabularyNavigation() {
  return useContext(VocabularyNavigationContext);
}
