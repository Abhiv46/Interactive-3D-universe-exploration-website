import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Star, Send, AlertCircle, MessageSquare, Loader2 } from 'lucide-react';
import { submitFeedbackOrBug } from '../../lib/feedbackService';
import { trackEvent, ANALYTICS_EVENTS } from '../../lib/analytics';
import { useAccessibility } from '../../hooks/useAccessibility';
import styles from './FeedbackModal.module.css';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { t, announce } = useAccessibility();
  const [type, setType] = useState<'feedback' | 'bug'>('feedback');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      // Focus first focusable element after render
      setTimeout(() => firstFocusableRef.current?.focus(), 0);
    } else {
      document.body.style.overflow = '';
      previousActiveElement.current?.focus();
      // Reset form
      setType('feedback');
      setRating(0);
      setMessage('');
      setEmail('');
      setSubmitStatus('idle');
      setErrorMessage('');
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Tab') {
        handleTabNavigation(e);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleTabNavigation = (e: KeyboardEvent) => {
    const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusableElements?.length) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setErrorMessage(t('feedback.ratingRequired'));
      announce(t('feedback.ratingRequired'));
      return;
    }
    if (!message.trim()) {
      setErrorMessage(t('feedback.messageRequired'));
      announce(t('feedback.messageRequired'));
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      await submitFeedbackOrBug(type, rating, message.trim(), email.trim() || undefined);

      trackEvent(type === 'bug' ? ANALYTICS_EVENTS.BUG_REPORT_SUBMITTED : ANALYTICS_EVENTS.FEEDBACK_SUBMITTED, {
        rating,
        has_email: !!email.trim(),
      });

      setSubmitStatus('success');
      announce(t('feedback.submitted'));
    } catch (err) {
      console.error('Feedback submission failed:', err);
      setSubmitStatus('error');
      setErrorMessage(t('feedback.submitError'));
      announce(t('feedback.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
      aria-describedby="feedback-description"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={styles.modal}
        ref={modalRef}
      >
        {/* Header */}
        <div className={styles.header}>
          <h2 id="feedback-title" className={styles.title}>
            {type === 'bug' ? t('feedback.reportBug') : t('feedback.sendFeedback')}
          </h2>
          <p id="feedback-description" className={styles.description}>
            {type === 'bug'
              ? t('feedback.bugDescription')
              : t('feedback.feedbackDescription')}
          </p>
          <button
            ref={firstFocusableRef}
            className={styles.closeButton}
            onClick={handleClose}
            aria-label={t('common.close')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Type Toggle */}
        <div className={styles.typeToggle} role="radiogroup" aria-label={t('feedback.typeLabel')}>
          <label className={`${styles.typeOption} ${type === 'feedback' ? styles.active : ''}`}>
            <input
              type="radio"
              name="feedback-type"
              value="feedback"
              checked={type === 'feedback'}
              onChange={() => {
                setType('feedback');
                trackEvent(ANALYTICS_EVENTS.FEEDBACK_OPENED, { type: 'feedback' });
              }}
              aria-label={t('feedback.feedback')}
            />
            <MessageSquare size={18} />
            <span>{t('feedback.feedback')}</span>
          </label>
          <label className={`${styles.typeOption} ${type === 'bug' ? styles.active : ''}`}>
            <input
              type="radio"
              name="feedback-type"
              value="bug"
              checked={type === 'bug'}
              onChange={() => {
                setType('bug');
                trackEvent(ANALYTICS_EVENTS.FEEDBACK_OPENED, { type: 'bug' });
              }}
              aria-label={t('feedback.bug')}
            />
            <AlertCircle size={18} />
            <span>{t('feedback.bug')}</span>
          </label>
        </div>

        {/* Rating */}
        <fieldset className={styles.ratingGroup}>
          <legend className={styles.ratingLabel}>{t('feedback.ratingLabel')}</legend>
          <div className={styles.stars} role="radiogroup" aria-label={t('feedback.ratingLabel')}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`${styles.star} ${rating >= star ? styles.filled : ''}`}
                onClick={() => {
                  setRating(star);
                  trackEvent(ANALYTICS_EVENTS.FEEDBACK_OPENED, { rating: star });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' && star < 5) setRating(star + 1);
                  if (e.key === 'ArrowLeft' && star > 1) setRating(star - 1);
                }}
                aria-label={`${star} ${t('feedback.star')}`}
                aria-checked={rating >= star}
                role="radio"
              >
                <Star size={28} />
              </button>
            ))}
          </div>
          <p className={styles.ratingHint}>
            {t('feedback.ratingHint')}
          </p>
        </fieldset>

        {/* Message */}
        <div className={styles.field}>
          <label htmlFor="feedback-message" className={styles.fieldLabel}>
            {t('feedback.messageLabel')} <span aria-hidden="true">*</span>
          </label>
          <textarea
            id="feedback-message"
            className={styles.textarea}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={type === 'bug' ? t('feedback.bugPlaceholder') : t('feedback.feedbackPlaceholder')}
            rows={5}
            required
            aria-required="true"
            aria-describedby="message-hint"
          />
          <p id="message-hint" className={styles.fieldHint}>
            {type === 'bug' ? t('feedback.bugHint') : t('feedback.feedbackHint')}
          </p>
        </div>

        {/* Email (optional) */}
        <div className={styles.field}>
          <label htmlFor="feedback-email" className={styles.fieldLabel}>
            {t('feedback.emailLabel')} <span className={styles.optional}>({t('common.optional')})</span>
          </label>
          <input
            id="feedback-email"
            type="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('feedback.emailPlaceholder')}
            autoComplete="email"
          />
        </div>

        {/* Error/Success Messages */}
        {errorMessage && (
          <div className={styles.error} role="alert" aria-live="polite">
            {errorMessage}
          </div>
        )}

        {submitStatus === 'success' && (
          <div className={styles.success} role="status" aria-live="polite">
            <div className={styles.successIcon} aria-hidden="true">✓</div>
            <p>{t('feedback.thankYou')}</p>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={styles.cancelButton}
            onClick={handleClose}
            disabled={submitting}
          >
            {t('common.cancel')}
          </button>
          <button
            ref={lastFocusableRef}
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={submitting || submitStatus === 'success'}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className={styles.spinner} aria-hidden="true" />
                {t('common.sending')}
              </>
            ) : submitStatus === 'success' ? (
              t('feedback.done')
            ) : (
              <>
                <Send size={18} aria-hidden="true" />
                {type === 'bug' ? t('feedback.submitBug') : t('feedback.submitFeedback')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}