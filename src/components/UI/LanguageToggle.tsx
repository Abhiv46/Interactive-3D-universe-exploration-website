import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Globe, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useI18n } from '../../i18n';
import styles from './LanguageToggle.module.css';

export function LanguageToggle() {
  const { language, setLanguage, availableLanguages, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  /**
   * The toggle lives inside the fixed `.top-bar` (z-index 100). A stacking
   * context caps every descendant's z-index, so the dropdown could never beat
   * the fixed `.settings-panel` (z-index 200) parked over the same corner —
   * the gear painted on top of the open options and swallowed their clicks.
   * Rendering the listbox through a portal to <body> escapes that context;
   * its z-index then applies globally and it outranks the settings panel.
   */
  const [anchor, setAnchor] = useState<{ top: number; left: number; width: number } | null>(null);

  // Capture the button's rect when the listbox opens so the portaled dropdown
  // is anchored to the same spot it occupied inside the top bar.
  useEffect(() => {
    if (!isOpen) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    setAnchor(rect ? { top: rect.top, left: rect.left, width: rect.width } : null);
  }, [isOpen]);

  // Close dropdown when clicking outside the button or the (possibly portaled) listbox
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (buttonRef.current?.contains(event.target as Node)) return;
      if (listboxRef.current?.contains(event.target as Node)) return;
      setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const currentLang = availableLanguages.find(l => l.code === language);

  return (
    <div className={styles.container}>
      <button
        ref={buttonRef}
        className={styles.button}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={t('navigation.language')}
        type="button"
      >
        <Globe size={18} aria-hidden="true" />
        <span className={styles.langCode}>{currentLang?.nativeName ?? language.toUpperCase()}</span>
        <span className={isOpen ? styles.chevronUp : styles.chevronDown} aria-hidden="true">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {isOpen &&
        anchor &&
        createPortal(
          <div
            className={styles.dropdownMount}
            style={{ top: anchor.top, left: anchor.left, width: anchor.width }}
          >
            <ul
              ref={listboxRef}
              className={styles.dropdown}
              role="listbox"
              aria-label={t('navigation.language')}
            >
              {availableLanguages.map((lang) => (
                <li key={lang.code}>
                  <button
                    role="option"
                    aria-selected={language === lang.code}
                    className={`${styles.option} ${language === lang.code ? styles.selected : ''}`}
                    onClick={() => {
                      setLanguage(lang.code);
                      setIsOpen(false);
                    }}
                    type="button"
                  >
                    <span className={styles.optionNativeName}>{lang.nativeName}</span>
                    <span className={styles.optionEnglishName}>{lang.name}</span>
                    {language === lang.code && (
                      <Check size={16} className={styles.checkIcon} aria-hidden="true" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}