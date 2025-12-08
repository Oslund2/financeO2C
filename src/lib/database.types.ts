export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      series: {
        Row: {
          id: string
          name: string
          description: string | null
          theme: string | null
          style_guide: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          theme?: string | null
          style_guide?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          theme?: string | null
          style_guide?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      characters: {
        Row: {
          id: string
          series_id: string | null
          name: string
          age: number | null
          description: string | null
          personality: string | null
          clay_features: string | null
          voice_characteristics: string | null
          eleven_labs_voice_id: string | null
          reference_image_url: string | null
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          series_id?: string | null
          name: string
          age?: number | null
          description?: string | null
          personality?: string | null
          clay_features?: string | null
          voice_characteristics?: string | null
          eleven_labs_voice_id?: string | null
          reference_image_url?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          series_id?: string | null
          name?: string
          age?: number | null
          description?: string | null
          personality?: string | null
          clay_features?: string | null
          voice_characteristics?: string | null
          eleven_labs_voice_id?: string | null
          reference_image_url?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      scripts: {
        Row: {
          id: string
          series_id: string | null
          title: string
          episode_number: number | null
          season_number: number
          runtime_minutes: number
          synopsis: string | null
          theme: string | null
          vocabulary_words: string[]
          status: string
          ai_generated: boolean
          generation_prompt: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          series_id?: string | null
          title: string
          episode_number?: number | null
          season_number?: number
          runtime_minutes?: number
          synopsis?: string | null
          theme?: string | null
          vocabulary_words?: string[]
          status?: string
          ai_generated?: boolean
          generation_prompt?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          series_id?: string | null
          title?: string
          episode_number?: number | null
          season_number?: number
          runtime_minutes?: number
          synopsis?: string | null
          theme?: string | null
          vocabulary_words?: string[]
          status?: string
          ai_generated?: boolean
          generation_prompt?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      script_acts: {
        Row: {
          id: string
          script_id: string | null
          act_number: number
          content: string | null
          duration_estimate: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          script_id?: string | null
          act_number: number
          content?: string | null
          duration_estimate?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          script_id?: string | null
          act_number?: number
          content?: string | null
          duration_estimate?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      script_scenes: {
        Row: {
          id: string
          act_id: string | null
          scene_number: number
          setting: string | null
          description: string | null
          dialogue: Json
          stage_directions: string | null
          characters: string[]
          duration_estimate: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          act_id?: string | null
          scene_number: number
          setting?: string | null
          description?: string | null
          dialogue?: Json
          stage_directions?: string | null
          characters?: string[]
          duration_estimate?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          act_id?: string | null
          scene_number?: number
          setting?: string | null
          description?: string | null
          dialogue?: Json
          stage_directions?: string | null
          characters?: string[]
          duration_estimate?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      assets: {
        Row: {
          id: string
          series_id: string | null
          character_id: string | null
          asset_type: string
          name: string
          description: string | null
          file_url: string | null
          thumbnail_url: string | null
          metadata: Json
          tags: string[]
          ai_generated: boolean
          generation_prompt: string | null
          usage_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          series_id?: string | null
          character_id?: string | null
          asset_type: string
          name: string
          description?: string | null
          file_url?: string | null
          thumbnail_url?: string | null
          metadata?: Json
          tags?: string[]
          ai_generated?: boolean
          generation_prompt?: string | null
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          series_id?: string | null
          character_id?: string | null
          asset_type?: string
          name?: string
          description?: string | null
          file_url?: string | null
          thumbnail_url?: string | null
          metadata?: Json
          tags?: string[]
          ai_generated?: boolean
          generation_prompt?: string | null
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      episodes: {
        Row: {
          id: string
          script_id: string | null
          series_id: string | null
          title: string
          status: string
          progress_percentage: number
          final_video_url: string | null
          production_notes: string | null
          estimated_cost: number | null
          actual_cost: number | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          script_id?: string | null
          series_id?: string | null
          title: string
          status?: string
          progress_percentage?: number
          final_video_url?: string | null
          production_notes?: string | null
          estimated_cost?: number | null
          actual_cost?: number | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          script_id?: string | null
          series_id?: string | null
          title?: string
          status?: string
          progress_percentage?: number
          final_video_url?: string | null
          production_notes?: string | null
          estimated_cost?: number | null
          actual_cost?: number | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      scene_shots: {
        Row: {
          id: string
          scene_id: string | null
          shot_number: number
          shot_type: string | null
          description: string | null
          characters: string[]
          background_asset_id: string | null
          image_asset_id: string | null
          video_asset_id: string | null
          audio_asset_id: string | null
          generation_status: string
          generation_parameters: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          scene_id?: string | null
          shot_number: number
          shot_type?: string | null
          description?: string | null
          characters?: string[]
          background_asset_id?: string | null
          image_asset_id?: string | null
          video_asset_id?: string | null
          audio_asset_id?: string | null
          generation_status?: string
          generation_parameters?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          scene_id?: string | null
          shot_number?: number
          shot_type?: string | null
          description?: string | null
          characters?: string[]
          background_asset_id?: string | null
          image_asset_id?: string | null
          video_asset_id?: string | null
          audio_asset_id?: string | null
          generation_status?: string
          generation_parameters?: Json
          created_at?: string
          updated_at?: string
        }
      }
      voice_recordings: {
        Row: {
          id: string
          scene_id: string | null
          character_id: string | null
          dialogue_text: string
          audio_asset_id: string | null
          eleven_labs_request_id: string | null
          emotion: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          scene_id?: string | null
          character_id?: string | null
          dialogue_text: string
          audio_asset_id?: string | null
          eleven_labs_request_id?: string | null
          emotion?: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          scene_id?: string | null
          character_id?: string | null
          dialogue_text?: string
          audio_asset_id?: string | null
          eleven_labs_request_id?: string | null
          emotion?: string
          status?: string
          created_at?: string
        }
      }
      production_jobs: {
        Row: {
          id: string
          job_type: string
          entity_id: string | null
          entity_type: string | null
          status: string
          service: string
          request_payload: Json
          response_data: Json
          error_message: string | null
          cost_estimate: number | null
          created_at: string
          started_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          job_type: string
          entity_id?: string | null
          entity_type?: string | null
          status?: string
          service: string
          request_payload?: Json
          response_data?: Json
          error_message?: string | null
          cost_estimate?: number | null
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          job_type?: string
          entity_id?: string | null
          entity_type?: string | null
          status?: string
          service?: string
          request_payload?: Json
          response_data?: Json
          error_message?: string | null
          cost_estimate?: number | null
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
      }
      storyboards: {
        Row: {
          id: string
          script_id: string
          series_id: string | null
          title: string
          status: string
          total_shots: number
          completed_shots: number
          style_preferences: Json
          generation_settings: Json
          ai_generated: boolean
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          script_id: string
          series_id?: string | null
          title: string
          status?: string
          total_shots?: number
          completed_shots?: number
          style_preferences?: Json
          generation_settings?: Json
          ai_generated?: boolean
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          script_id?: string
          series_id?: string | null
          title?: string
          status?: string
          total_shots?: number
          completed_shots?: number
          style_preferences?: Json
          generation_settings?: Json
          ai_generated?: boolean
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      storyboard_shots: {
        Row: {
          id: string
          storyboard_id: string
          scene_id: string | null
          shot_number: number
          scene_shot_number: number
          shot_type: string
          camera_angle: string
          camera_movement: string
          shot_description: string | null
          composition_notes: string | null
          character_positions: Json
          lighting_notes: string | null
          props_needed: string[]
          duration_seconds: number
          dialogue_text: string | null
          stage_directions: string | null
          image_prompt: string | null
          image_url: string | null
          thumbnail_url: string | null
          generation_status: string
          generation_metadata: Json
          revision_notes: string | null
          approved: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          storyboard_id: string
          scene_id?: string | null
          shot_number: number
          scene_shot_number: number
          shot_type?: string
          camera_angle?: string
          camera_movement?: string
          shot_description?: string | null
          composition_notes?: string | null
          character_positions?: Json
          lighting_notes?: string | null
          props_needed?: string[]
          duration_seconds?: number
          dialogue_text?: string | null
          stage_directions?: string | null
          image_prompt?: string | null
          image_url?: string | null
          thumbnail_url?: string | null
          generation_status?: string
          generation_metadata?: Json
          revision_notes?: string | null
          approved?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          storyboard_id?: string
          scene_id?: string | null
          shot_number?: number
          scene_shot_number?: number
          shot_type?: string
          camera_angle?: string
          camera_movement?: string
          shot_description?: string | null
          composition_notes?: string | null
          character_positions?: Json
          lighting_notes?: string | null
          props_needed?: string[]
          duration_seconds?: number
          dialogue_text?: string | null
          stage_directions?: string | null
          image_prompt?: string | null
          image_url?: string | null
          thumbnail_url?: string | null
          generation_status?: string
          generation_metadata?: Json
          revision_notes?: string | null
          approved?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      storyboard_revisions: {
        Row: {
          id: string
          storyboard_id: string
          revision_number: number
          created_by: string | null
          revision_notes: string | null
          snapshot_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          storyboard_id: string
          revision_number: number
          created_by?: string | null
          revision_notes?: string | null
          snapshot_data?: Json
          created_at?: string
        }
        Update: {
          id?: string
          storyboard_id?: string
          revision_number?: number
          created_by?: string | null
          revision_notes?: string | null
          snapshot_data?: Json
          created_at?: string
        }
      }
    }
  }
}
