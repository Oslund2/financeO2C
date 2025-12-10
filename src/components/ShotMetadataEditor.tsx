import { useState } from 'react';
import { X, Save, RotateCcw, Edit3, Camera, Film, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type StoryboardShot = Database['public']['Tables']['storyboard_shots']['Row'];

interface ShotMetadataEditorProps {
  shot: StoryboardShot;
  onClose: () => void;
  onSave: () => void;
}

const SHOT_TYPES = [
  { value: 'establishing', label: 'Establishing Shot' },
  { value: 'wide', label: 'Wide Shot' },
  { value: 'medium', label: 'Medium Shot' },
  { value: 'close_up', label: 'Close-Up' },
  { value: 'over_shoulder', label: 'Over-the-Shoulder' },
  { value: 'reaction', label: 'Reaction Shot' },
  { value: 'insert', label: 'Insert Shot' },
  { value: 'two_shot', label: 'Two Shot' }
];

const CAMERA_ANGLES = [
  { value: 'eye_level', label: 'Eye Level' },
  { value: 'high', label: 'High Angle' },
  { value: 'low', label: 'Low Angle' },
  { value: 'dutch', label: 'Dutch Angle' },
  { value: 'overhead', label: 'Overhead' },
  { value: 'pov', label: 'Point of View' }
];

const CAMERA_MOVEMENTS = [
  { value: 'static', label: 'Static' },
  { value: 'pan', label: 'Pan' },
  { value: 'tilt', label: 'Tilt' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'dolly', label: 'Dolly' },
  { value: 'tracking', label: 'Tracking' }
];

export function ShotMetadataEditor({ shot, onClose, onSave }: ShotMetadataEditorProps) {
  const [formData, setFormData] = useState({
    shot_type: shot.shot_type || 'medium',
    camera_angle: shot.camera_angle || 'eye_level',
    camera_movement: shot.camera_movement || 'static',
    shot_description: shot.shot_description || '',
    composition_notes: shot.composition_notes || '',
    lighting_notes: shot.lighting_notes || '',
    stage_directions: shot.stage_directions || '',
    dialogue_text: shot.dialogue_text || '',
    duration_seconds: shot.duration_seconds || 5
  });

  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleReset = () => {
    setFormData({
      shot_type: shot.shot_type || 'medium',
      camera_angle: shot.camera_angle || 'eye_level',
      camera_movement: shot.camera_movement || 'static',
      shot_description: shot.shot_description || '',
      composition_notes: shot.composition_notes || '',
      lighting_notes: shot.lighting_notes || '',
      stage_directions: shot.stage_directions || '',
      dialogue_text: shot.dialogue_text || '',
      duration_seconds: shot.duration_seconds || 5
    });
    setHasChanges(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('storyboard_shots')
        .update({
          ...formData,
          last_edited_by: 'user',
          last_edited_at: new Date().toISOString()
        })
        .eq('id', shot.id);

      if (error) throw error;

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving shot metadata:', error);
      alert(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Edit3 className="w-6 h-6" />
            <div>
              <h2 className="text-2xl font-bold">Edit Shot Metadata</h2>
              <p className="text-blue-100 text-sm">Shot #{shot.shot_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Film className="w-4 h-4" />
                Shot Type
              </label>
              <select
                value={formData.shot_type}
                onChange={(e) => handleChange('shot_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {SHOT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Camera className="w-4 h-4" />
                Camera Angle
              </label>
              <select
                value={formData.camera_angle}
                onChange={(e) => handleChange('camera_angle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {CAMERA_ANGLES.map(angle => (
                  <option key={angle.value} value={angle.value}>{angle.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Film className="w-4 h-4" />
                Camera Movement
              </label>
              <select
                value={formData.camera_movement}
                onChange={(e) => handleChange('camera_movement', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {CAMERA_MOVEMENTS.map(movement => (
                  <option key={movement.value} value={movement.value}>{movement.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4" />
              Duration (seconds)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={formData.duration_seconds}
              onChange={(e) => handleChange('duration_seconds', parseInt(e.target.value) || 5)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Visual Description
            </label>
            <textarea
              value={formData.shot_description}
              onChange={(e) => handleChange('shot_description', e.target.value)}
              rows={4}
              placeholder="Describe what is visible in this shot..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Composition Notes
            </label>
            <textarea
              value={formData.composition_notes}
              onChange={(e) => handleChange('composition_notes', e.target.value)}
              rows={3}
              placeholder="Framing, positioning, rule of thirds..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Lighting Notes
            </label>
            <textarea
              value={formData.lighting_notes}
              onChange={(e) => handleChange('lighting_notes', e.target.value)}
              rows={2}
              placeholder="Lighting setup, mood, key light..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Dialogue
            </label>
            <textarea
              value={formData.dialogue_text}
              onChange={(e) => handleChange('dialogue_text', e.target.value)}
              rows={2}
              placeholder="Character dialogue during this shot..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Stage Directions
            </label>
            <textarea
              value={formData.stage_directions}
              onChange={(e) => handleChange('stage_directions', e.target.value)}
              rows={2}
              placeholder="Character actions and movements..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 bg-gray-50 flex items-center justify-between">
          <button
            onClick={handleReset}
            disabled={!hasChanges || saving}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
