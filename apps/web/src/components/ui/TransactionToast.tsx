'use client';

import { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

type ToastType = 'success' | 'error' | 'loading' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  txHash?: string;
}

let toastListeners: Array<(toast: Toast) => void> = [];

export function showToast(message: string, type: ToastType = 'info', txHash?: string) {
  const toast: Toast = { id: Date.now().toString(), message, type, txHash };
  toastListeners.forEach(listener => listener(toast));
}

export function TransactionToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts(prev => [...prev, toast]);
      if (toast.type !== 'loading') {
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toast.id));
        }, 5000);
      }
    };

    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={cn(
            'flex items-start gap-3 p-4 rounded-lg border shadow-lg text-sm animate-fadeIn',
            toast.type === 'success' && 'bg-green-950 border-green-800 text-green-200',
            toast.type === 'error' && 'bg-red-950 border-red-800 text-red-200',
            toast.type === 'loading' && 'bg-card border-border text-foreground',
            toast.type === 'info' && 'bg-card border-border text-foreground'
          )}
        >
          <div className="flex-1">
            <p>{toast.message}</p>
            {toast.txHash && (
              <a
                href={`https://etherscan.io/tx/${toast.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline mt-1 block"
              >
                View on Etherscan
              </a>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-muted-foreground hover:text-foreground ml-2 mt-0.5"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
