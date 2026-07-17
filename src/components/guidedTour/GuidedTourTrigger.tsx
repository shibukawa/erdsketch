import { useEffect } from "react";
import type { GuidedTourId } from "../../features/guidedTour/tours";
import { useGuidedTour } from "./GuidedTourContext";

export function GuidedTourTrigger({ tour }: { tour: GuidedTourId }) {
  const { startAutomatically } = useGuidedTour();

  useEffect(() => {
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => startAutomatically(tour));
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [startAutomatically, tour]);

  return null;
}
