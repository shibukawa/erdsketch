import { Languages } from "lucide-react";
import { useCallback, type ChangeEvent } from "react";
import { useI18n } from "./I18nProvider";
import type { Locale } from "./translations";

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const handleChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setLocale(event.target.value as Locale);
  }, [setLocale]);

  return <label className="join items-center" aria-label="Language">
    <span className="btn join-item btn-sm pointer-events-none px-2" aria-hidden="true"><Languages size={15} /></span>
    <select className="select join-item select-sm w-24" value={locale} onChange={handleChange} aria-label="Language">
      <option value="ja">日本語</option>
      <option value="en">English</option>
    </select>
  </label>;
}
