import { ACTIONS, EVENTS, ORIGIN, STATUS, Joyride, type EventData } from "react-joyride";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { guidedTourVersions, getGuidedTourSteps, type GuidedTourId } from "../../features/guidedTour/tours";
import { hasGuidedTourOutcome, saveGuidedTourOutcome } from "../../features/guidedTour/tourProgress";
import { GuidedTourTooltip } from "./GuidedTourTooltip";
import { GuidedTourContext } from "./GuidedTourContext";

export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  const [activeTour, setActiveTour] = useState<GuidedTourId | null>(null);
  const [run, setRun] = useState(false);
  const [runSequence, setRunSequence] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const activeTourRef = useRef<GuidedTourId | null>(null);
  const launchFocusRef = useRef<HTMLElement | null>(null);
  const shownStepsRef = useRef(new Set<string>());

  const begin = useCallback((id: GuidedTourId, automatic: boolean) => {
    if (activeTourRef.current) return;
    if (automatic && hasGuidedTourOutcome(window.localStorage, id, guidedTourVersions[id])) return;
    activeTourRef.current = id;
    launchFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    shownStepsRef.current = new Set();
    setActiveTour(id);
    setRunSequence((current) => current + 1);
    setRun(true);
  }, []);

  const startAutomatically = useCallback((id: GuidedTourId) => begin(id, true), [begin]);
  const replay = useCallback((id: GuidedTourId) => begin(id, false), [begin]);

  const end = useCallback(() => {
    const launchFocus = launchFocusRef.current;
    launchFocusRef.current = null;
    activeTourRef.current = null;
    setRun(false);
    setActiveTour(null);
    window.requestAnimationFrame(() => {
      if (launchFocus?.isConnected) launchFocus.focus();
    });
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!run) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      end();
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [end, run]);

  const handleEvent = useCallback((event: EventData) => {
    const current = activeTourRef.current;
    if (!current) return;
    if (event.type === EVENTS.TOOLTIP && event.step.id) shownStepsRef.current.add(event.step.id);

    if (event.action === ACTIONS.CLOSE) {
      end();
      return;
    }
    if (event.type !== EVENTS.TOUR_END) return;

    if (event.status === STATUS.FINISHED && shownStepsRef.current.size > 0) {
      saveGuidedTourOutcome(window.localStorage, current, guidedTourVersions[current], "completed");
    } else if (event.status === STATUS.SKIPPED && event.origin === ORIGIN.BUTTON_SKIP) {
      saveGuidedTourOutcome(window.localStorage, current, guidedTourVersions[current], "skipped");
    }
    end();
  }, [end]);

  const steps = useMemo(() => activeTour ? getGuidedTourSteps(activeTour, locale) : [], [activeTour, locale]);
  const joyrideLocale = useMemo(() => locale === "ja" ? {
    back: "戻る",
    close: "一時的に閉じる",
    last: "完了",
    next: "次へ",
    nextWithProgress: "次へ（{current}/{total}）",
    open: "説明を開く",
    skip: "今後表示しない"
  } : {
    back: "Back",
    close: "Close for now",
    last: "Finish",
    next: "Next",
    nextWithProgress: "Next ({current}/{total})",
    open: "Open guide",
    skip: "Don't show again"
  }, [locale]);

  const value = useMemo(() => ({ closeTemporarily: end, startAutomatically, replay }), [end, replay, startAutomatically]);

  return <GuidedTourContext.Provider value={value}>
    {children}
    <Joyride
      key={`${activeTour ?? "idle"}-${runSequence}`}
      run={run}
      steps={steps}
      portalElement={activeTour === "fields" ? "[data-guided-tour-portal='fields']" : undefined}
      continuous
      scrollToFirstStep
      onEvent={handleEvent}
      tooltipComponent={GuidedTourTooltip}
      locale={joyrideLocale}
      options={{
        blockTargetInteraction: true,
        buttons: ["back", "close", "primary", "skip"],
        closeButtonAction: "skip",
        dismissKeyAction: false,
        overlayClickAction: false,
        overlayColor: "rgb(15 23 42 / 0.72)",
        primaryColor: "#2563eb",
        scrollDuration: reducedMotion ? 0 : 300,
        showProgress: true,
        skipBeacon: true,
        spotlightPadding: 8,
        spotlightRadius: 10,
        targetWaitTimeout: 1600,
        textColor: "#0f172a",
        zIndex: 1000
      }}
      styles={{ tooltip: { borderRadius: 14, boxShadow: "0 25px 50px -12px rgb(15 23 42 / 0.35)" } }}
    />
  </GuidedTourContext.Provider>;
}
