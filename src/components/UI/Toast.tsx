import { useState, useCallback, useRef, useEffect } from 'react';
import { createContext, useContext, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useAccessibility } from '../../hooks/useAccessibility';
import styles from './Toast.module.css';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  const { t, announce } = useAccessibility();

  // Announce new toasts
  useEffect(() => {
    if (toasts.length > 0) {
      const latest = toasts[toasts.length - 1];
      announce(`${latest.title}${latest.message ? `: ${latest.message}` : ''}`);
    }
  }, [toasts, announce]);

  if (toasts.length === 0) return null;

  return (
    <div
      className={styles.container}
      role="region"
      aria-label={t('toast.regionLabel')}
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const { t } = useAccessibility();
  const [isExiting, setIsExiting] = useState(false);
  const timeoutRef = useRef<number>();

  useEffect(() => {
    if (toast.duration !== 0) {
      const duration = toast.duration ?? (toast.type === 'error' ? 8000 : 5000);
      timeoutRef.current = window.setTimeout(() => {
        dismiss();
      }, duration);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [toast.duration, toast.type]);

  const dismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 200);
  }, [onRemove, toast.id]);

  const icons = {
    success: <CheckCircle size={20} />,
    error: <AlertCircle size={20} />,
    info: <Info size={20} />,
  };

  const Icon = icons[toast.type];

  return (
    <div
      className={`${styles.toast} ${styles[toast.type]} ${isExiting ? styles.exiting : ''}`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={styles.iconWrapper} aria-hidden="true">
        {Icon}
      </div>
      <div className={styles.content}>
        <div className={styles.title}>{toast.title}</div>
        {toast.message && <div className={styles.message}>{toast.message}</div>}
      </div>
      {toast.action && (
        <button
          className={styles.action}
          onClick={() => {
            toast.action?.onClick();
            dismiss();
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        className={styles.close}
        onClick={dismiss}
        aria-label={t('common.close')}
      >
        <X size={16} />
      </button>
    </div>
  );
}

// Toast context/provider for global access

interface ToastContextValue {
  showToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}