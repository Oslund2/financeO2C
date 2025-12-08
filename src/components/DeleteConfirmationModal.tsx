import { useState, useEffect } from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  entityType: string;
  entityName: string;
  relatedItems?: {
    label: string;
    count: number;
  }[];
  warningMessage?: string;
  requireTyping?: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  entityType,
  entityName,
  relatedItems = [],
  warningMessage,
  requireTyping = false,
}: DeleteConfirmationModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [canProceed, setCanProceed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setConfirmText('');
      setIsDeleting(false);
      setCountdown(3);
      setCanProceed(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 2 && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (step === 2 && countdown === 0) {
      setCanProceed(true);
    }
  }, [step, countdown]);

  useEffect(() => {
    if (requireTyping && confirmText === entityName) {
      setCanProceed(true);
    } else if (!requireTyping && step === 2 && countdown === 0) {
      setCanProceed(true);
    }
  }, [confirmText, entityName, requireTyping, step, countdown]);

  const handleDelete = async () => {
    if (!canProceed) return;

    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error deleting:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {step === 1 ? 'Confirm Deletion' : 'Final Confirmation'}
                </h2>
                <p className="text-sm text-gray-600">
                  {step === 1 ? 'Step 1 of 2' : 'Step 2 of 2'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-6">
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-900 font-medium mb-2">
                You are about to delete:
              </p>
              <p className="text-red-700 text-lg font-semibold">
                {entityType}: "{entityName}"
              </p>
            </div>

            {warningMessage && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-900 text-sm">{warningMessage}</p>
              </div>
            )}

            {relatedItems.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <p className="text-gray-900 font-medium mb-2">
                  This will also affect:
                </p>
                <ul className="space-y-1">
                  {relatedItems.map((item, index) => (
                    <li key={index} className="text-gray-700 text-sm">
                      • {item.label}: <span className="font-semibold">{item.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {step === 1 && (
              <div className="text-gray-700 text-sm">
                <p className="font-medium mb-2">
                  This action cannot be undone. Please review carefully before proceeding.
                </p>
              </div>
            )}

            {step === 2 && (
              <div>
                {requireTyping ? (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Type "{entityName}" to confirm deletion:
                    </label>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      disabled={isDeleting}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50"
                      placeholder={entityName}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="mb-4">
                    <p className="text-gray-700 text-sm font-medium mb-2">
                      Are you absolutely sure? This action is permanent.
                    </p>
                    {countdown > 0 && (
                      <div className="text-center py-4">
                        <div className="text-4xl font-bold text-red-600">{countdown}</div>
                        <p className="text-sm text-gray-600 mt-1">Preparing delete action...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {step === 1 ? (
              <>
                <button
                  onClick={onClose}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                >
                  Continue to Step 2
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setStep(1)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
                >
                  Go Back
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!canProceed || isDeleting}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Permanently
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
