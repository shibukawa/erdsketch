import { createContext, useContext } from "react";
import type { GuidedTourId } from "../../features/guidedTour/tours";

export type GuidedTourContextValue = {
  closeTemporarily: () => void;
  startAutomatically: (id: GuidedTourId) => void;
  replay: (id: GuidedTourId) => void;
};

export const GuidedTourContext = createContext<GuidedTourContextValue | undefined>(undefined);

export function useGuidedTour(): GuidedTourContextValue {
  const context = useContext(GuidedTourContext);
  if (!context) throw new Error("useGuidedTour must be used inside GuidedTourProvider");
  return context;
}
