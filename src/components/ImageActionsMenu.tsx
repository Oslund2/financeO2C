import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Upload, Trash2, RefreshCw, Wand2, FileImage } from 'lucide-react';

interface ImageActionsMenuProps {
  hasImage: boolean;
  onUpload: () => void;
  onDelete: () => void;
  onRegenerate: () => void;
  onGenerateAI: () => void;
  onUploadReference?: () => void;
  disabled?: boolean;
}

export function ImageActionsMenu({
  hasImage,
  onUpload,
  onDelete,
  onRegenerate,
  onGenerateAI,
  onUploadReference,
  disabled = false
}: ImageActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Image actions"
      >
        <MoreVertical className="w-5 h-5 text-gray-600" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
          {hasImage ? (
            <>
              <button
                onClick={() => handleAction(onUpload)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <Upload className="w-4 h-4" />
                Replace Image
              </button>
              <button
                onClick={() => handleAction(onRegenerate)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate AI
              </button>
              {onUploadReference && (
                <button
                  onClick={() => handleAction(onUploadReference)}
                  className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-3"
                >
                  <FileImage className="w-4 h-4" />
                  Upload Manual Reference
                </button>
              )}
              <div className="border-t border-gray-200 my-1"></div>
              <button
                onClick={() => handleAction(onDelete)}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
              >
                <Trash2 className="w-4 h-4" />
                Delete Image
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleAction(onUpload)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <Upload className="w-4 h-4" />
                Upload Image
              </button>
              <button
                onClick={() => handleAction(onGenerateAI)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <Wand2 className="w-4 h-4" />
                Generate with AI
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
