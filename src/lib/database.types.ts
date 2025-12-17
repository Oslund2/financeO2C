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
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: string
          invited_by: string | null
          invited_at: string | null
          joined_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: string
          invited_by?: string | null
          invited_at?: string | null
          joined_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: string
          invited_by?: string | null
          invited_at?: string | null
          joined_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      series: {
        Row: {
          id: string
          name: string
          description: string | null
          theme: string | null
          style_guide: string | null
          organization_id: string | null
          archived: boolean
          archived_at: string | null
          archived_by: string | null
          default_episode_count: number
          featured_trailer_id: string | null
          featured_trailer_title: string | null
          featured_trailer_association_type: string | null
          featured_trailer_association_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          theme?: string | null
          style_guide?: string | null
          organization_id?: string | null
          archived?: boolean
          archived_at?: string | null
          archived_by?: string | null
          default_episode_count?: number
          featured_trailer_id?: string | null
          featured_trailer_title?: string | null
          featured_trailer_association_type?: string | null
          featured_trailer_association_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          theme?: string | null
          style_guide?: string | null
          organization_id?: string | null
          archived?: boolean
          archived_at?: string | null
          archived_by?: string | null
          default_episode_count?: number
          featured_trailer_id?: string | null
          featured_trailer_title?: string | null
          featured_trailer_association_type?: string | null
          featured_trailer_association_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      characters: {
        Row: {
          id: string
          series_id: string | null
          organization_id: string | null
          name: string
          age: number | null
          description: string | null
          personality: string | null
          clay_features: string | null
          voice_characteristics: string | null
          eleven_labs_voice_id: string | null
          voice_provider: string | null
          chatterbox_voice_id: string | null
          reference_image_url: string | null
          lip_sync_reference_image_url: string | null
          tags: string[]
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          series_id?: string | null
          organization_id?: string | null
          name: string
          age?: number | null
          description?: string | null
          personality?: string | null
          clay_features?: string | null
          voice_characteristics?: string | null
          eleven_labs_voice_id?: string | null
          voice_provider?: string | null
          chatterbox_voice_id?: string | null
          reference_image_url?: string | null
          lip_sync_reference_image_url?: string | null
          tags?: string[]
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          series_id?: string | null
          organization_id?: string | null
          name?: string
          age?: number | null
          description?: string | null
          personality?: string | null
          clay_features?: string | null
          voice_characteristics?: string | null
          eleven_labs_voice_id?: string | null
          voice_provider?: string | null
          chatterbox_voice_id?: string | null
          reference_image_url?: string | null
          lip_sync_reference_image_url?: string | null
          tags?: string[]
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      character_consistency_profiles: {
        Row: {
          id: string
          series_id: string
          organization_id: string | null
          name: string
          description: string | null
          age: number | null
          personality: string | null
          clay_features: string | null
          voice_characteristics: string | null
          eleven_labs_voice_id: string | null
          voice_provider: string | null
          chatterbox_voice_id: string | null
          reference_image_url: string | null
          lip_sync_reference_image_url: string | null
          tags: string[]
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          series_id: string
          organization_id?: string | null
          name: string
          description?: string | null
          age?: number | null
          personality?: string | null
          clay_features?: string | null
          voice_characteristics?: string | null
          eleven_labs_voice_id?: string | null
          voice_provider?: string | null
          chatterbox_voice_id?: string | null
          reference_image_url?: string | null
          lip_sync_reference_image_url?: string | null
          tags?: string[]
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          series_id?: string
          organization_id?: string | null
          name?: string
          description?: string | null
          age?: number | null
          personality?: string | null
          clay_features?: string | null
          voice_characteristics?: string | null
          eleven_labs_voice_id?: string | null
          voice_provider?: string | null
          chatterbox_voice_id?: string | null
          reference_image_url?: string | null
          lip_sync_reference_image_url?: string | null
          tags?: string[]
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      scripts: {
        Row: {
          id: string
          series_id: string | null
          organization_id: string | null
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
          content: string | null
          format: string | null
          version: number
          locked: boolean
          locked_by: string | null
          locked_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          series_id?: string | null
          organization_id?: string | null
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
          content?: string | null
          format?: string | null
          version?: number
          locked?: boolean
          locked_by?: string | null
          locked_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          series_id?: string | null
          organization_id?: string | null
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
          content?: string | null
          format?: string | null
          version?: number
          locked?: boolean
          locked_by?: string | null
          locked_at?: string | null
          created_by?: string | null
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
          organization_id: string | null
          title: string
          episode_number: number | null
          status: string
          progress_percentage: number
          final_video_url: string | null
          production_notes: string | null
          estimated_cost: number | null
          actual_cost: number | null
          source_script_snapshot: Json | null
          script_version: number | null
          sync_status: string | null
          multi_part_episode: boolean
          part_number: number | null
          previous_episode_id: string | null
          next_episode_id: string | null
          trt_metadata: Json | null
          target_runtime_seconds: number | null
          actual_runtime_seconds: number | null
          date_put_in_service: string | null
          projected_service_years: number
          decay_rate_percent: number
          minimum_retention_percent: number
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          script_id?: string | null
          series_id?: string | null
          organization_id?: string | null
          title: string
          episode_number?: number | null
          status?: string
          progress_percentage?: number
          final_video_url?: string | null
          production_notes?: string | null
          estimated_cost?: number | null
          actual_cost?: number | null
          source_script_snapshot?: Json | null
          script_version?: number | null
          sync_status?: string | null
          multi_part_episode?: boolean
          part_number?: number | null
          previous_episode_id?: string | null
          next_episode_id?: string | null
          trt_metadata?: Json | null
          target_runtime_seconds?: number | null
          actual_runtime_seconds?: number | null
          date_put_in_service?: string | null
          projected_service_years?: number
          decay_rate_percent?: number
          minimum_retention_percent?: number
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          script_id?: string | null
          series_id?: string | null
          organization_id?: string | null
          title?: string
          episode_number?: number | null
          status?: string
          progress_percentage?: number
          final_video_url?: string | null
          production_notes?: string | null
          estimated_cost?: number | null
          actual_cost?: number | null
          source_script_snapshot?: Json | null
          script_version?: number | null
          sync_status?: string | null
          multi_part_episode?: boolean
          part_number?: number | null
          previous_episode_id?: string | null
          next_episode_id?: string | null
          trt_metadata?: Json | null
          target_runtime_seconds?: number | null
          actual_runtime_seconds?: number | null
          date_put_in_service?: string | null
          projected_service_years?: number
          decay_rate_percent?: number
          minimum_retention_percent?: number
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
          organization_id: string | null
          episode_id: string | null
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
          organization_id?: string | null
          episode_id?: string | null
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
          organization_id?: string | null
          episode_id?: string | null
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
          approval_status: string | null
          approved_by: string | null
          approved_at: string | null
          review_notes: string | null
          current_version: number
          last_edited_by: string | null
          last_edited_at: string | null
          published: boolean
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
          approval_status?: string | null
          approved_by?: string | null
          approved_at?: string | null
          review_notes?: string | null
          current_version?: number
          last_edited_by?: string | null
          last_edited_at?: string | null
          published?: boolean
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
          approval_status?: string | null
          approved_by?: string | null
          approved_at?: string | null
          review_notes?: string | null
          current_version?: number
          last_edited_by?: string | null
          last_edited_at?: string | null
          published?: boolean
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
      production_shot_plans: {
        Row: {
          id: string
          episode_id: string
          organization_id: string | null
          storyboard_shot_id: string | null
          shot_number: number
          shot_type: string | null
          description: string | null
          duration_seconds: number | null
          dialogue_text: string | null
          status: string
          render_url: string | null
          render_metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          episode_id: string
          organization_id?: string | null
          storyboard_shot_id?: string | null
          shot_number: number
          shot_type?: string | null
          description?: string | null
          duration_seconds?: number | null
          dialogue_text?: string | null
          status?: string
          render_url?: string | null
          render_metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          episode_id?: string
          organization_id?: string | null
          storyboard_shot_id?: string | null
          shot_number?: number
          shot_type?: string | null
          description?: string | null
          duration_seconds?: number | null
          dialogue_text?: string | null
          status?: string
          render_url?: string | null
          render_metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      production_shot_prompts: {
        Row: {
          id: string
          shot_plan_id: string
          prompt_type: string
          prompt_text: string
          version: number
          is_active: boolean
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shot_plan_id: string
          prompt_type?: string
          prompt_text: string
          version?: number
          is_active?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shot_plan_id?: string
          prompt_type?: string
          prompt_text?: string
          version?: number
          is_active?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      lip_sync_jobs: {
        Row: {
          id: string
          episode_id: string
          organization_id: string | null
          shot_plan_id: string | null
          character_id: string | null
          dialogue_text: string | null
          audio_url: string | null
          video_url: string | null
          output_url: string | null
          provider: string | null
          provider_job_id: string | null
          status: string
          error_message: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          episode_id: string
          organization_id?: string | null
          shot_plan_id?: string | null
          character_id?: string | null
          dialogue_text?: string | null
          audio_url?: string | null
          video_url?: string | null
          output_url?: string | null
          provider?: string | null
          provider_job_id?: string | null
          status?: string
          error_message?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          episode_id?: string
          organization_id?: string | null
          shot_plan_id?: string | null
          character_id?: string | null
          dialogue_text?: string | null
          audio_url?: string | null
          video_url?: string | null
          output_url?: string | null
          provider?: string | null
          provider_job_id?: string | null
          status?: string
          error_message?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      patent_applications: {
        Row: {
          id: string
          organization_id: string | null
          title: string | null
          status: string
          abstract: string | null
          specification: string | null
          field_of_invention: string | null
          background_art: string | null
          summary_invention: string | null
          detailed_description: string | null
          prior_art_search_status: string
          prior_art_search_completed_at: string | null
          novelty_score: number | null
          novelty_analysis_id: string | null
          differentiation_analysis: string | null
          claims_generation_status: string
          claims_generation_completed_at: string | null
          drawings_generation_status: string
          drawings_generation_completed_at: string | null
          specification_generation_status: string
          specification_generation_completed_at: string | null
          full_application_status: string
          full_application_completed_at: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          title?: string | null
          status?: string
          abstract?: string | null
          specification?: string | null
          field_of_invention?: string | null
          background_art?: string | null
          summary_invention?: string | null
          detailed_description?: string | null
          prior_art_search_status?: string
          prior_art_search_completed_at?: string | null
          novelty_score?: number | null
          novelty_analysis_id?: string | null
          differentiation_analysis?: string | null
          claims_generation_status?: string
          claims_generation_completed_at?: string | null
          drawings_generation_status?: string
          drawings_generation_completed_at?: string | null
          specification_generation_status?: string
          specification_generation_completed_at?: string | null
          full_application_status?: string
          full_application_completed_at?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          title?: string | null
          status?: string
          abstract?: string | null
          specification?: string | null
          field_of_invention?: string | null
          background_art?: string | null
          summary_invention?: string | null
          detailed_description?: string | null
          prior_art_search_status?: string
          prior_art_search_completed_at?: string | null
          novelty_score?: number | null
          novelty_analysis_id?: string | null
          differentiation_analysis?: string | null
          claims_generation_status?: string
          claims_generation_completed_at?: string | null
          drawings_generation_status?: string
          drawings_generation_completed_at?: string | null
          specification_generation_status?: string
          specification_generation_completed_at?: string | null
          full_application_status?: string
          full_application_completed_at?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      patent_claims: {
        Row: {
          id: string
          application_id: string
          claim_number: number
          claim_type: string
          claim_text: string
          parent_claim_id: string | null
          status: string
          category: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          application_id: string
          claim_number: number
          claim_type?: string
          claim_text: string
          parent_claim_id?: string | null
          status?: string
          category?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          application_id?: string
          claim_number?: number
          claim_type?: string
          claim_text?: string
          parent_claim_id?: string | null
          status?: string
          category?: string
          created_at?: string
          updated_at?: string
        }
      }
      patent_drawings: {
        Row: {
          id: string
          application_id: string
          figure_number: number
          title: string
          description: string | null
          svg_content: string | null
          image_url: string | null
          drawing_type: string
          callouts: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          application_id: string
          figure_number: number
          title: string
          description?: string | null
          svg_content?: string | null
          image_url?: string | null
          drawing_type?: string
          callouts?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          application_id?: string
          figure_number?: number
          title?: string
          description?: string | null
          svg_content?: string | null
          image_url?: string | null
          drawing_type?: string
          callouts?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
