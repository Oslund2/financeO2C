import { useState } from 'react';
import { CheckCircle, XCircle, Clock, FileText, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type StoryboardShot = Database['public']['Tables']['storyboard_shots']['Row'];

interface ApprovalWorkflowProps {
  shot: StoryboardShot;
  onClose: () => void;
  onApprovalChanged: () => void;
}

const APPROVAL_STATUSES = [
  { value: 'draft', label: 'Draft', icon: FileText, color: 'gray' },
  { value: 'pending_review', label: 'Pending Review', icon: Clock, color: 'yellow' },
  { value: 'approved', label: 'Approved', icon: CheckCircle, color: 'green' },
  { value: 'rejected', label: 'Rejected', icon: XCircle, color: 'red' }
];

export function ApprovalWorkflow({ shot, onClose, onApprovalChanged }: ApprovalWorkflowProps) {
  const [approvalStatus, setApprovalStatus] = useState(shot.approval_status || 'draft');
  const [reviewNotes, setReviewNotes] = useState(shot.review_notes || '');
  const [published, setPublished] = useState(shot.published || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData: any = {
        approval_status: approvalStatus,
        review_notes: reviewNotes,
        published: published,
        last_edited_by: 'user',
        last_edited_at: new Date().toISOString()
      };

      if (approvalStatus === 'approved') {
        updateData.approved_by = 'user';
        updateData.approved_at = new Date().toISOString();
      } else {
        updateData.approved_by = null;
        updateData.approved_at = null;
      }

      const { error } = await supabase
        .from('storyboard_shots')
        .update(updateData)
        .eq('id', shot.id);

      if (error) throw error;

      onApprovalChanged();
      onClose();
    } catch (error) {
      console.error('Error updating approval status:', error);
      alert(error instanceof Error ? error.message : 'Failed to update approval status');
    } finally {
      setSaving(false);
    }
  };

  const currentStatus = APPROVAL_STATUSES.find(s => s.value === approvalStatus);
  const StatusIcon = currentStatus?.icon || FileText;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <StatusIcon className={`w-6 h-6 text-${currentStatus?.color}-600`} />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Approval Workflow</h3>
          <p className="text-sm text-gray-600">Shot #{shot.shot_number}</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Approval Status
        </label>
        <div className="grid grid-cols-2 gap-3">
          {APPROVAL_STATUSES.map((status) => {
            const Icon = status.icon;
            const isSelected = approvalStatus === status.value;
            return (
              <button
                key={status.value}
                onClick={() => setApprovalStatus(status.value)}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? `border-${status.color}-500 bg-${status.color}-50`
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isSelected ? `text-${status.color}-600` : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${isSelected ? `text-${status.color}-900` : 'text-gray-700'}`}>
                  {status.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <MessageSquare className="w-4 h-4" />
          Review Notes
        </label>
        <textarea
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          rows={4}
          placeholder="Add feedback, comments, or revision requests..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <div>
            <div className="font-medium text-blue-900">Mark as Published</div>
            <div className="text-sm text-blue-700">
              Published shots are finalized and ready for production
            </div>
          </div>
        </label>
      </div>

      {shot.approved_by && shot.approved_at && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-900 font-medium mb-1">
            <CheckCircle className="w-4 h-4" />
            Previously Approved
          </div>
          <div className="text-sm text-green-700">
            By {shot.approved_by} on {new Date(shot.approved_at).toLocaleDateString()} at{' '}
            {new Date(shot.approved_at).toLocaleTimeString()}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={onClose}
          disabled={saving}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
