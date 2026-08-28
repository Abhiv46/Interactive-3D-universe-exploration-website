import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useI18n } from '../../i18n';
import styles from './LanguageToggle.module.css';

export function LanguageToggle() {
  const { language, setLanguage, availableLanguages, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
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
    <div className={styles.container} ref={dropdownRef}>
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

      {isOpen && (
        <ul
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
      )}
    </div>
  );
}