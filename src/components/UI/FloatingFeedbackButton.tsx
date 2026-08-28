import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, ChevronRight } from 'lucide-react';
import { useAccessibility } from '../../hooks/useAccessibility';
import styles from './FloatingFeedbackButton.module.css';

interface FloatingFeedbackButtonProps {
  onOpenFeedback: () => void;
}

export function FloatingFeedbackButton({ onOpenFeedback }: FloatingFeedbackButtonProps) {
  const { t } = useAccessibility();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const labelTimeoutRef = useRef<number>();

  // Show label after hover delay
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    labelTimeoutRef.current = window.setTimeout(() => {
      setShowLabel(true);
    }, 800);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setShowLabel(false);
    if (labelTimeoutRef.current) {
      clearTimeout(labelTimeoutRef.current);
    }
  }, []);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setShowLabel(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    setShowLabel(false);
  }, []);

  const handleClick = useCallback(() => {
    onOpenFeedback();
  }, [onOpenFeedback]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpenFeedback();
    }
  }, [onOpenFeedback]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (labelTimeoutRef.current) {
        clearTimeout(labelTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        className={`${styles.button} ${isHovered || isFocused ? styles.hovered : ''} ${showLabel ? styles.showLabel : ''}`}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        aria-label={t('feedback.floatingLabel')}
        aria-expanded="false"
        aria-haspopup="dialog"
        type="button"
      >
        <span className={styles.icon} aria-hidden="true">
          <MessageSquare size={24} />
        </span>
        <span className={styles.label} aria-hidden="true">
          {t('feedback.floatingLabel')}
        </span>
        <span className={styles.chevron} aria-hidden="true">
          <ChevronRight size={16} />
        </span>
      </button>

      {/* Screen reader only announcement when opened */}
      <div
        className={styles.srOnly}
        aria-live="polite"
        aria-atomic="true"
      >
        {isHovered || isFocused ? t('feedback.floatingHint') : ''}
      </div>
    </>
  );
}