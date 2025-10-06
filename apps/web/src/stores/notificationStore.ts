import { create } from 'zustand';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: 'default' | 'success' | 'error';
}

interface NotificationState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>(set => ({
  toasts: [],
  addToast: toast =>
    set(state => ({
      toasts: [
        ...state.toasts,
        {
          ...toast,
          id: crypto.randomUUID(),
        },
      ],
    })),
  removeToast: id =>
    set(state => ({
      toasts: state.toasts.filter(toast => toast.id !== id),
    })),
}));
