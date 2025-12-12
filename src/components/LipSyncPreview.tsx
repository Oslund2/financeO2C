import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Download, RefreshCw, Play } from 'lucide-react';
import { lipSyncService } from '../services/lipSyncService';

interface LipSyncPreviewProps {
  jobId: string;
  shotNumber: number;
  videoUrl: string;
  isApproved?: boolean;
  onClose: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onRetry?: () => void;
}

export function LipSyncPreview({
  jobId,
  shotNumber,
  videoUrl,
  isApproved,
  onClose,
  onApprove,
  onReject,
  onRetry,
}: LipSyncPreviewProps) {
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');

  async function handleApprove() {
    if (!onApprove) return;

    setProcessing(true);
    setMessage('Approving...');

    try {
      const userId = (await import('../lib/supabase')).supabase.auth.getUser();
      if (userId.data.user) {
        await lipSyncService.approveJob(jobId, userId.data.user.id, true);
      }
      setMessage('Approved successfully');
      setTimeout(() => {
        onApprove();
      }, 1000);
    } catch (error) {
      console.error('Error approving:', error);
      setMessage('Error approving job');
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    if (!onReject) return;

    setProcessing(true);
    setMessage('Rejecting...');

    try {
      const userId = (await import('../lib/supabase')).supabase.auth.getUser();
      if (userId.data.user) {
        await lipSyncService.approveJob(jobId, userId.data.user.id, false);
      }
      setMessage('Rejected');
      setTimeout(() => {
        onReject();
      }, 1000);
    } catch (error) {
      console.error('Error rejecting:', error);
      setMessage('Error rejecting job');
    } finally {
      setProcessing(false);
    }
  }

  async function handleRetry() {
    if (!onRetry) return;

    setProcessing(true);
    setMessage('Retrying...');

    try {
      await lipSyncService.retryJob(jobId);
      setMessage('Retry job created');
      setTimeout(() => {
        onRetry();
      }, 1000);
    } catch (error) {
      console.error('Error retrying:', error);
      setMessage('Error creating retry job');
    } finally {
      setProcessing(false);
    }
  }

  function handleDownload() {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `shot-${shotNumber}-lipsync.mp4`;
    link.click();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Lip Sync Preview - Shot {shotNumber}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {message && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800">{message}</p>
            </div>
          )}

          <div className="bg-black rounded-lg overflow-hidden mb-6">
            <video
              src={videoUrl}
              controls
              className="w-full"
              style={{ maxHeight: '60vh' }}
            >
              Your browser does not support the video tag.
            </video>
          </div>

          {isApproved !== undefined && (
            <div className={`mb-4 p-4 rounded-lg ${isApproved ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2">
                {isApproved ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-900">Approved</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-900">Rejected</span>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              <Download className="w-5 h-5" />
              Download
            </button>

            {onRetry && (
              <button
                onClick={handleRetry}
                disabled={processing}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                <RefreshCw className="w-5 h-5" />
                Retry
              </button>
            )}

            {onReject && !isApproved && (
              <button
                onClick={handleReject}
                disabled={processing}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                <XCircle className="w-5 h-5" />
                Reject
              </button>
            )}

            {onApprove && !isApproved && (
              <button
                onClick={handleApprove}
                disabled={processing}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                <CheckCircle className="w-5 h-5" />
                Approve
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
