import { useEffect } from 'react';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';
import { useNotificationStore } from '@/stores/notificationStore';

export function Toaster() {
  const { toasts, removeToast } = useNotificationStore();

  useEffect(() => {
    const timers = toasts.map((toast) =>
      setTimeout(() => {
        removeToast(toast.id);
      }, 5000)
    );

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [toasts, removeToast]);

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, variant }) => (
        <Toast key={id} variant={variant}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
