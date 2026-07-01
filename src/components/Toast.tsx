import React, { useEffect } from 'react';
import { CheckCircle, Info, Warning } from '@phosphor-icons/react';

interface ToastProps {
  message: string;
  type?: 'success' | 'info' | 'warning';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = 'info', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgClass = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 ring-emerald-500/10',
    info: 'bg-zinc-900/90 text-zinc-100 border-zinc-800 ring-zinc-800/50 dark:bg-zinc-900 dark:border-zinc-800',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20 ring-amber-500/10',
  }[type];

  const Icon = {
    success: CheckCircle,
    info: Info,
    warning: Warning,
  }[type];

  return (
    <div
      role={type === 'warning' ? 'alert' : 'status'}
      aria-live={type === 'warning' ? 'assertive' : 'polite'}
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border ring-4 backdrop-blur-md transition-all duration-300 animate-slide-in ${bgClass}`}
    >
      <Icon size={18} weight="bold" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
