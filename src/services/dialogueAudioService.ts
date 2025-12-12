import { supabase } from '../lib/supabase';
import { elevenLabsService } from './elevenLabsService';

interface DialogueShot {
  id: string;
  shotNumber: number;
  dialogue: string;
  characterId?: string;
  characterName?: string;
}

export interface GenerateAudioParams {
  shotId: string;
  episodeId: string;
  organizationId: string;
  dialogue: string;
  characterId?: string;
  voiceId?: string;
  voiceProvider?: 'elevenlabs' | 'chatterbox';
}

export interface DialogueAudioClip {
  id: string;
  shotId: string;
  episodeId: string;
  characterId?: string;
  dialogueText: string;
  audioUrl: string;
  durationSeconds: number;
  voiceProvider: string;
  voiceId?: string;
  generationCost: number;
  createdAt: string;
}

class DialogueAudioService {
  async detectDialogueInShots(episodeId: string): Promise<void> {
    const { data: shots, error } = await supabase
      .from('production_shot_plans')
      .select('id, dialogue, character_id')
      .eq('episode_id', episodeId);

    if (error) throw error;

    for (const shot of shots || []) {
      const hasDialogue = shot.dialogue && shot.dialogue.trim().length > 0;
      await supabase
        .from('production_shot_plans')
        .update({
          has_dialogue: hasDialogue,
          requires_lip_sync: hasDialogue,
        })
        .eq('id', shot.id);
    }
  }

  async getDialogueShots(episodeId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('production_shot_plans')
      .select(`
        *,
        characters(id, name, voice_id, chatterbox_voice_id),
        dialogue_audio_clips(*)
      `)
      .eq('episode_id', episodeId)
      .eq('has_dialogue', true)
      .order('shot_number', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async generateAudio(params: GenerateAudioParams): Promise<string> {
    const provider = params.voiceProvider || 'elevenlabs';

    let audioBlob: Blob;
    let cost = 0;

    if (provider === 'elevenlabs' && params.voiceId) {
      const result = await elevenLabsService.generateSpeech(params.dialogue, params.voiceId);
      audioBlob = result.audio;
      cost = result.cost;
    } else {
      throw new Error('Voice provider not supported or voice ID missing');
    }

    const fileName = `${params.organizationId}/${params.episodeId}/${params.shotId}/${Date.now()}.mp3`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('dialogue-audio')
      .upload(fileName, audioBlob, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('dialogue-audio')
      .getPublicUrl(fileName);

    const audioDuration = await this.estimateAudioDuration(params.dialogue);

    const { data: clipData, error: clipError } = await supabase
      .from('dialogue_audio_clips')
      .insert({
        organization_id: params.organizationId,
        shot_id: params.shotId,
        episode_id: params.episodeId,
        character_id: params.characterId,
        dialogue_text: params.dialogue,
        audio_url: urlData.publicUrl,
        duration_seconds: audioDuration,
        voice_provider: provider,
        voice_id: params.voiceId,
        generation_cost: cost,
      })
      .select()
      .single();

    if (clipError) throw clipError;

    return clipData.id;
  }

  async getAudioClip(shotId: string): Promise<DialogueAudioClip | null> {
    const { data, error } = await supabase
      .from('dialogue_audio_clips')
      .select('*')
      .eq('shot_id', shotId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getAudioClipsByEpisode(episodeId: string): Promise<DialogueAudioClip[]> {
    const { data, error } = await supabase
      .from('dialogue_audio_clips')
      .select('*')
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async deleteAudioClip(clipId: string): Promise<void> {
    const { data: clip, error: fetchError } = await supabase
      .from('dialogue_audio_clips')
      .select('audio_url')
      .eq('id', clipId)
      .single();

    if (fetchError) throw fetchError;

    const urlParts = clip.audio_url.split('/dialogue-audio/');
    if (urlParts.length === 2) {
      const filePath = urlParts[1];
      await supabase.storage.from('dialogue-audio').remove([filePath]);
    }

    const { error: deleteError } = await supabase
      .from('dialogue_audio_clips')
      .delete()
      .eq('id', clipId);

    if (deleteError) throw deleteError;
  }

  async batchGenerateAudio(episodeId: string, organizationId: string): Promise<{ success: number; failed: number; errors: string[] }> {
    const dialogueShots = await this.getDialogueShots(episodeId);

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const shot of dialogueShots) {
      if (!shot.dialogue || shot.dialogue.trim().length === 0) {
        continue;
      }

      const existingClip = await this.getAudioClip(shot.id);
      if (existingClip) {
        success++;
        continue;
      }

      try {
        const character = shot.characters;
        const voiceId = character?.voice_id || character?.chatterbox_voice_id;

        if (!voiceId) {
          errors.push(`Shot ${shot.shot_number}: No voice ID configured for character`);
          failed++;
          continue;
        }

        await this.generateAudio({
          shotId: shot.id,
          episodeId,
          organizationId,
          dialogue: shot.dialogue,
          characterId: shot.character_id,
          voiceId,
          voiceProvider: character.voice_id ? 'elevenlabs' : 'chatterbox',
        });

        success++;
      } catch (error) {
        errors.push(`Shot ${shot.shot_number}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failed++;
      }
    }

    return { success, failed, errors };
  }

  private async estimateAudioDuration(text: string): Promise<number> {
    const wordsPerMinute = 150;
    const words = text.split(/\s+/).length;
    const minutes = words / wordsPerMinute;
    return Math.ceil(minutes * 60);
  }

  async getTotalAudioCost(episodeId: string): Promise<number> {
    const { data, error } = await supabase
      .from('dialogue_audio_clips')
      .select('generation_cost')
      .eq('episode_id', episodeId);

    if (error) throw error;

    return (data || []).reduce((sum, clip) => sum + (clip.generation_cost || 0), 0);
  }

  async getCharacterImage(characterId: string, shotId?: string): Promise<string | null> {
    const { data: character } = await supabase
      .from('characters')
      .select('lip_sync_reference_image_url, image_url')
      .eq('id', characterId)
      .single();

    if (character?.lip_sync_reference_image_url) {
      return character.lip_sync_reference_image_url;
    }

    if (character?.image_url) {
      return character.image_url;
    }

    if (shotId) {
      const { data: shot } = await supabase
        .from('production_shot_plans')
        .select('storyboard_image_url')
        .eq('id', shotId)
        .single();

      if (shot?.storyboard_image_url) {
        return shot.storyboard_image_url;
      }
    }

    return null;
  }
}

export const dialogueAudioService = new DialogueAudioService();
