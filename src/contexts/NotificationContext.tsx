import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastContainer, ToastMessage, ToastType } from '../components/Toast';

interface NotificationContextType {
  showToast: (options: Omit<ToastMessage, 'id'>) => string;
  showSuccess: (title: string, message?: string) => string;
  showError: (title: string, message?: string) => string;
  showWarning: (title: string, message?: string) => string;
  showInfo: (title: string, message?: string) => string;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

let toastIdCounter = 0;
const generateId = () => `toast-${++toastIdCounter}-${Date.now()}`;

interface NotificationProviderProps {
  children: ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
}

export function NotificationProvider({
  children,
  position = 'top-right',
  maxToasts = 5
}: NotificationProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((options: Omit<ToastMessage, 'id'>) => {
    const id = generateId();
    const newToast: ToastMessage = { ...options, id };

    setToasts((current) => {
      const updated = [newToast, ...current];
      if (updated.length > maxToasts) {
        return updated.slice(0, maxToasts);
      }
      return updated;
    });

    return id;
  }, [maxToasts]);

  const createShorthandMethod = useCallback((type: ToastType) => {
    return (title: string, message?: string) => {
      return showToast({ type, title, message });
    };
  }, [showToast]);

  const showSuccess = useCallback(createShorthandMethod('success'), [createShorthandMethod]);
  const showError = useCallback(createShorthandMethod('error'), [createShorthandMethod]);
  const showWarning = useCallback(createShorthandMethod('warning'), [createShorthandMethod]);
  const showInfo = useCallback(createShorthandMethod('info'), [createShorthandMethod]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        dismissToast,
        dismissAll,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} position={position} />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
