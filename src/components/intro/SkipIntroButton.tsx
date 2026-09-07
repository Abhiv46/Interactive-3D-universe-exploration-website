import { useIntro } from '@/context/IntroContext';
import { X } from 'lucide-react';

/**
 * Skip Intro Button — Fixed position overlay, accessible, glassmorphic
 * Visible during all intro phases, jumps to transition phase on click
 */
export function SkipIntroButton() {
  const { skipIntro, phase, hasCompleted } = useIntro();

  // Don't render if intro is already complete
  if (phase === 'complete' || hasCompleted) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    skipIntro();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      skipIntro();
    }
  };

  return (
    <button
      className="skip-intro-button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label="Skip introduction and go to interactive view"
      title="Skip Intro (S)"
      type="button"
      tabIndex={0}
    >
      <span className="skip-intro-text">Skip Intro</span>
      <X className="skip-intro-icon" aria-hidden="true" size={16} strokeWidth={2.5} />
    </button>
  );
}