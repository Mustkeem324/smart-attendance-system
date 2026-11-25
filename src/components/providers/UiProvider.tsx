'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import Modal from '@/components/Modal';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}

interface PromptOptions {
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  confirmText?: string;
  required?: boolean;
}

export interface ToastFn {
  (message: string, variant?: ToastVariant, title?: string): void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

interface UiContextType {
  toast: ToastFn;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const noopToast = Object.assign(() => {}, {
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
}) as ToastFn;

const UiContext = createContext<UiContextType>({
  toast: noopToast,
  confirm: async () => false,
  prompt: async () => null,
});

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (val: boolean) => void;
  } | null>(null);
  const [promptState, setPromptState] = useState<{
    options: PromptOptions;
    value: string;
    error?: string;
    resolve: (val: string | null) => void;
  } | null>(null);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (message: string, variant: ToastVariant = 'info', title?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-4), { id, message, variant, title }]);
      setTimeout(() => dismissToast(id), 4500);
    },
    [dismissToast]
  );

  const toast: ToastFn = React.useMemo(
    () =>
      Object.assign(
        (message: string, variant: ToastVariant = 'info', title?: string) =>
          pushToast(message, variant, title),
        {
          success: (message: string, title?: string) => pushToast(message, 'success', title),
          error: (message: string, title?: string) => pushToast(message, 'error', title),
          warning: (message: string, title?: string) => pushToast(message, 'warning', title),
          info: (message: string, title?: string) => pushToast(message, 'info', title),
        }
      ),
    [pushToast]
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ options, resolve });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setPromptState({
        options,
        value: options.defaultValue || '',
        resolve,
      });
    });
  }, []);

  const handleConfirmClose = (accepted: boolean) => {
    if (!confirmState) return;
    confirmState.resolve(accepted);
    setConfirmState(null);
  };

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptState) return;
    if (promptState.options.required && !promptState.value.trim()) {
      setPromptState({ ...promptState, error: 'This field is required.' });
      return;
    }
    promptState.resolve(promptState.value.trim());
    setPromptState(null);
  };

  const handlePromptCancel = () => {
    if (!promptState) return;
    promptState.resolve(null);
    setPromptState(null);
  };

  return (
    <UiContext.Provider value={{ toast, confirm, prompt }}>
      {children}

      {/* Enterprise Toast Stack */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-20 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6"
      >
        {toasts.map((t) => {
          const styles = {
            success: 'border-[#12B886]/30 bg-white text-[#15172B] dark:bg-[#15172B] dark:text-white',
            error: 'border-[#EF476F]/40 bg-white text-[#15172B] dark:bg-[#15172B] dark:text-white',
            warning: 'border-[#F59E0B]/40 bg-white text-[#15172B] dark:bg-[#15172B] dark:text-white',
            info: 'border-[#6538ED]/30 bg-white text-[#15172B] dark:bg-[#15172B] dark:text-white',
          }[t.variant];

          const Icon = {
            success: CheckCircle2,
            error: XCircle,
            warning: AlertTriangle,
            info: Info,
          }[t.variant];

          const iconColor = {
            success: 'text-[#12B886]',
            error: 'text-[#EF476F]',
            warning: 'text-[#F59E0B]',
            info: 'text-[#6538ED]',
          }[t.variant];

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-3.5 shadow-enterprise-lg animate-in slide-in-from-right-4 duration-200 ${styles}`}
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
              <div className="min-w-0 flex-1">
                {t.title && <p className="text-xs font-bold">{t.title}</p>}
                <p className="text-xs text-slate-600 dark:text-slate-300">{t.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirm Dialog */}
      <Modal
        isOpen={Boolean(confirmState)}
        onClose={() => handleConfirmClose(false)}
        title={confirmState?.options.title || 'Confirm Action'}
        maxWidthClass="max-w-md"
        panelClassName="p-6"
        footer={
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => handleConfirmClose(false)}
              className="enterprise-btn-secondary"
            >
              {confirmState?.options.cancelLabel || 'Cancel'}
            </button>
            <button
              type="button"
              onClick={() => handleConfirmClose(true)}
              className={
                confirmState?.options.variant === 'danger'
                  ? 'inline-flex items-center justify-center rounded-xl bg-[#EF476F] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-105'
                  : 'enterprise-btn-primary'
              }
            >
              {confirmState?.options.confirmText || confirmState?.options.confirmLabel || 'Confirm'}
            </button>
          </div>
        }
      >
        <p className="py-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {confirmState?.options.message}
        </p>
      </Modal>

      {/* Prompt Dialog */}
      <Modal
        isOpen={Boolean(promptState)}
        onClose={handlePromptCancel}
        title={promptState?.options.title || 'Provide Input'}
        description={promptState?.options.message}
        maxWidthClass="max-w-md"
        panelClassName="p-6"
      >
        <form onSubmit={handlePromptSubmit} className="space-y-4 pt-3">
          <div>
            <input
              type="text"
              autoFocus
              value={promptState?.value || ''}
              onChange={(e) =>
                promptState &&
                setPromptState({ ...promptState, value: e.target.value, error: undefined })
              }
              placeholder={promptState?.options.placeholder || 'Enter remarks or reference...'}
              className="enterprise-input"
            />
            {promptState?.error && (
              <p className="mt-1.5 text-[11px] font-semibold text-[#EF476F]">{promptState.error}</p>
            )}
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <button type="button" onClick={handlePromptCancel} className="enterprise-btn-secondary">
              Cancel
            </button>
            <button type="submit" className="enterprise-btn-primary">
              {promptState?.options.confirmText || promptState?.options.confirmLabel || 'Submit'}
            </button>
          </div>
        </form>
      </Modal>
    </UiContext.Provider>
  );
}

export function useUi() {
  return useContext(UiContext);
}
