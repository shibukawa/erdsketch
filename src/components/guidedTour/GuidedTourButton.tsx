import { CircleHelp } from "lucide-react";
import { useCallback } from "react";
import type { GuidedTourId } from "../../features/guidedTour/tours";
import { useI18n } from "../../i18n/I18nProvider";
import { translateText } from "../../i18n/translations";
import { useGuidedTour } from "./GuidedTourContext";

type Props = {
  tour: GuidedTourId;
  label?: string;
  compact?: boolean;
};

export function GuidedTourButton({ tour, label = "Guide", compact = false }: Props) {
  const { replay } = useGuidedTour();
  const { locale } = useI18n();
  const handleClick = useCallback(() => replay(tour), [replay, tour]);
  const localizedLabel = translateText(label, locale);
  const accessibleLabel = locale === "ja" ? `${localizedLabel}のガイドを再表示` : `Replay ${label} guide`;

  return <button type="button" className={`btn btn-ghost btn-sm ${compact ? "btn-square" : "gap-2"}`} onClick={handleClick} aria-label={accessibleLabel} title={accessibleLabel}>
    <CircleHelp size={17} />{!compact && translateText("Guide", locale)}
  </button>;
}
