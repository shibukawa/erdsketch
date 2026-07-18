import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { localeStorageKey, resolveInitialLocale, translateText, type Locale } from "./translations";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);
const translatedAttributes = ["aria-label", "placeholder", "title", "data-tip"] as const;
const textState = new WeakMap<Text, { source: string; rendered: string }>();
const attributeState = new WeakMap<Element, Map<string, { source: string; rendered: string }>>();

function withOriginalWhitespace(source: string, translated: string): string {
  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

function localizeTextNode(node: Text, locale: Locale) {
  const current = node.data;
  const previous = textState.get(node);
  const source = previous && (current === previous.rendered || current === previous.source) ? previous.source : current;
  const trimmed = source.trim();
  const rendered = trimmed ? withOriginalWhitespace(source, translateText(trimmed, locale)) : source;
  textState.set(node, { source, rendered });
  if (current !== rendered) node.data = rendered;
}

function localizeElement(element: Element, locale: Locale) {
  const states = attributeState.get(element) ?? new Map<string, { source: string; rendered: string }>();
  for (const attribute of translatedAttributes) {
    const current = element.getAttribute(attribute);
    if (current === null) continue;
    const previous = states.get(attribute);
    const source = previous && (current === previous.rendered || current === previous.source) ? previous.source : current;
    const rendered = translateText(source, locale);
    states.set(attribute, { source, rendered });
    if (current !== rendered) element.setAttribute(attribute, rendered);
  }
  attributeState.set(element, states);
}

function localizeTree(root: Node, locale: Locale) {
  if (root.nodeType === Node.TEXT_NODE) {
    if (root.parentElement?.closest("[data-i18n-skip]")) return;
    localizeTextNode(root as Text, locale);
    return;
  }
  if (!(root instanceof Element)) return;
  if (root.closest("[data-i18n-skip]")) return;
  localizeElement(root, locale);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node instanceof Element && node.closest("[data-i18n-skip]")) {
      node = walker.nextSibling();
      continue;
    }
    if (node.nodeType === Node.TEXT_NODE) localizeTextNode(node as Text, locale);
    else localizeElement(node as Element, locale);
    node = walker.nextNode();
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>(resolveInitialLocale);

  const setLocale = useCallback((nextLocale: Locale) => {
    window.localStorage.setItem(localeStorageKey, nextLocale);
    updateLocale(nextLocale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const nativeAlert = window.alert;
    const nativeConfirm = window.confirm;
    window.alert = (message?: unknown) => nativeAlert.call(window, typeof message === "string" ? translateText(message, locale) : message);
    window.confirm = (message?: string) => nativeConfirm.call(window, message ? translateText(message, locale) : message);
    return () => {
      window.alert = nativeAlert;
      window.confirm = nativeConfirm;
    };
  }, [locale]);

  useLayoutEffect(() => {
    const root = document.body;
    localizeTree(root, locale);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") mutation.addedNodes.forEach((node) => localizeTree(node, locale));
        else localizeTree(mutation.target, locale);
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: [...translatedAttributes], characterData: true, childList: true, subtree: true });
    return () => observer.disconnect();
  }, [locale]);

  return <I18nContext.Provider value={{ locale, setLocale }}><div className="contents">{children}</div></I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
