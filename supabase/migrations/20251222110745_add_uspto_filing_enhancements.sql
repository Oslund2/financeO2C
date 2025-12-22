/*
  # USPTO Filing Enhancements for Patent Applications

  This migration adds comprehensive USPTO filing support including:
  
  1. New Fields on patent_applications
    - `cpc_classifications` (jsonb) - AI-suggested and user-selected CPC codes
    - `entity_status` (text) - Regular, Small Entity, or Micro Entity status
    - `inventors` (jsonb) - Array of inventor objects with full details
    - `correspondence_address` (jsonb) - Mailing address for USPTO correspondence
    - `attorney_info` (jsonb) - Optional attorney/agent details
    - `government_interest` (text) - Government funding disclosure statement
    - `foreign_priority_claims` (jsonb) - Foreign priority filing information
    - `filing_checklist_status` (jsonb) - Tracks completion of filing requirements
    - `provisional_filing_date` (timestamptz) - Date provisional was filed
    - `conversion_deadline` (timestamptz) - 12-month deadline for non-provisional
    - `estimated_filing_fee` (numeric) - Calculated filing fee amount

  2. New Table: cpc_classification_reference
    - Reference data for common CPC classes used in classification suggestions
    
  3. Security
    - RLS policies for new reference table
*/

-- Add new columns to patent_applications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'cpc_classifications'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN cpc_classifications jsonb DEFAULT '{"primary": null, "secondary": [], "ai_suggested": true, "confidence": null}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'entity_status'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN entity_status text DEFAULT 'regular';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'inventors'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN inventors jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'correspondence_address'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN correspondence_address jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'attorney_info'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN attorney_info jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'government_interest'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN government_interest text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'foreign_priority_claims'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN foreign_priority_claims jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'filing_checklist_status'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN filing_checklist_status jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'provisional_filing_date'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN provisional_filing_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'conversion_deadline'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN conversion_deadline timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patent_applications' AND column_name = 'estimated_filing_fee'
  ) THEN
    ALTER TABLE patent_applications ADD COLUMN estimated_filing_fee numeric(10,2);
  END IF;
END $$;

-- Add constraint for entity_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'valid_entity_status'
  ) THEN
    ALTER TABLE patent_applications 
    ADD CONSTRAINT valid_entity_status 
    CHECK (entity_status IN ('regular', 'small_entity', 'micro_entity'));
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Create CPC classification reference table
CREATE TABLE IF NOT EXISTS cpc_classification_reference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  parent_code text,
  level integer NOT NULL DEFAULT 1,
  category text NOT NULL,
  keywords text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cpc_ref_code ON cpc_classification_reference(code);
CREATE INDEX IF NOT EXISTS idx_cpc_ref_parent ON cpc_classification_reference(parent_code);
CREATE INDEX IF NOT EXISTS idx_cpc_ref_category ON cpc_classification_reference(category);

-- Enable RLS
ALTER TABLE cpc_classification_reference ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read CPC reference data
CREATE POLICY "Anyone can read CPC reference data"
  ON cpc_classification_reference FOR SELECT
  TO authenticated
  USING (true);

-- Insert common CPC classification reference data for software/tech patents
INSERT INTO cpc_classification_reference (code, title, description, parent_code, level, category, keywords) VALUES
-- G Section - Physics
('G', 'Physics', 'Physics section of CPC', NULL, 1, 'section', ARRAY['physics', 'computing', 'data']),

-- G06 - Computing; Calculating; Counting
('G06', 'Computing; Calculating; Counting', 'Computing, calculating or counting arrangements', 'G', 2, 'class', ARRAY['computing', 'calculating', 'counting', 'data processing']),

-- G06F - Electric Digital Data Processing
('G06F', 'Electric Digital Data Processing', 'Electric digital data processing', 'G06', 3, 'subclass', ARRAY['digital', 'data processing', 'software', 'computer']),
('G06F3', 'Input/Output Arrangements', 'Input arrangements for transferring data to be processed into a form capable of being handled by the computer', 'G06F', 4, 'group', ARRAY['input', 'output', 'user interface', 'display']),
('G06F8', 'Program Development', 'Arrangements for software engineering', 'G06F', 4, 'group', ARRAY['software development', 'programming', 'compiler', 'code generation']),
('G06F9', 'Program Control', 'Arrangements for program control', 'G06F', 4, 'group', ARRAY['program control', 'execution', 'scheduling', 'multitasking']),
('G06F16', 'Information Retrieval; Database Structures', 'Information retrieval; Database structures therefor', 'G06F', 4, 'group', ARRAY['database', 'information retrieval', 'search', 'indexing', 'query']),
('G06F18', 'Pattern Recognition', 'Pattern recognition', 'G06F', 4, 'group', ARRAY['pattern recognition', 'classification', 'clustering', 'feature extraction']),
('G06F21', 'Security Arrangements', 'Security arrangements for protecting computers, components thereof, programs or data against unauthorised activity', 'G06F', 4, 'group', ARRAY['security', 'authentication', 'encryption', 'access control']),
('G06F40', 'Natural Language Processing', 'Handling natural language data', 'G06F', 4, 'group', ARRAY['natural language', 'text processing', 'NLP', 'linguistics']),

-- G06N - Computing Arrangements Based on Specific Computational Models (AI/ML)
('G06N', 'Computing Arrangements Based on Specific Computational Models', 'Computer systems based on specific computational models', 'G06', 3, 'subclass', ARRAY['AI', 'machine learning', 'neural network', 'artificial intelligence']),
('G06N3', 'Biological Models', 'Computer systems based on biological models', 'G06N', 4, 'group', ARRAY['neural network', 'deep learning', 'biological model', 'brain-inspired']),
('G06N3/02', 'Neural Networks', 'Neural networks', 'G06N3', 5, 'subgroup', ARRAY['neural network', 'deep learning', 'perceptron', 'backpropagation']),
('G06N3/04', 'Architecture', 'Architecture, e.g. interconnection topology', 'G06N3', 5, 'subgroup', ARRAY['network architecture', 'topology', 'layers', 'CNN', 'RNN', 'transformer']),
('G06N3/08', 'Learning Methods', 'Learning methods', 'G06N3', 5, 'subgroup', ARRAY['training', 'learning', 'supervised', 'unsupervised', 'reinforcement']),
('G06N5', 'Knowledge Based Systems', 'Computer systems using knowledge based models', 'G06N', 4, 'group', ARRAY['knowledge base', 'expert system', 'reasoning', 'inference']),
('G06N20', 'Machine Learning', 'Machine learning', 'G06N', 4, 'group', ARRAY['machine learning', 'ML', 'statistical learning', 'model training']),

-- G06Q - Business Data Processing
('G06Q', 'Data Processing Systems for Business', 'Information and communication technology specially adapted for administrative, commercial, financial, managerial or supervisory purposes', 'G06', 3, 'subclass', ARRAY['business', 'commerce', 'finance', 'management', 'workflow']),
('G06Q10', 'Administration; Management', 'Administration; Management', 'G06Q', 4, 'group', ARRAY['administration', 'management', 'workflow', 'resource allocation']),
('G06Q10/06', 'Resources Planning', 'Resources, workflows, human or project management', 'G06Q10', 5, 'subgroup', ARRAY['resource planning', 'workflow management', 'project management', 'scheduling']),
('G06Q10/10', 'Office Automation', 'Office automation', 'G06Q10', 5, 'subgroup', ARRAY['office automation', 'document management', 'collaboration']),
('G06Q20', 'Payment Schemes', 'Payment architectures, schemes or protocols', 'G06Q', 4, 'group', ARRAY['payment', 'transaction', 'billing', 'financial transaction']),
('G06Q30', 'Commerce', 'Commerce, e.g. shopping or e-commerce', 'G06Q', 4, 'group', ARRAY['commerce', 'e-commerce', 'shopping', 'marketing', 'advertising']),
('G06Q30/02', 'Marketing', 'Marketing, e.g. market research and analysis, surveying, promotions, advertising, buyer profiling', 'G06Q30', 5, 'subgroup', ARRAY['marketing', 'advertising', 'promotion', 'market research']),
('G06Q50', 'Sector Specific Applications', 'Systems or methods specially adapted for specific business sectors', 'G06Q', 4, 'group', ARRAY['industry specific', 'vertical', 'healthcare', 'education', 'media']),
('G06Q50/10', 'Services', 'Services', 'G06Q50', 5, 'subgroup', ARRAY['services', 'entertainment', 'media', 'content delivery']),

-- G06T - Image Data Processing
('G06T', 'Image Data Processing', 'Image data processing or generation, in general', 'G06', 3, 'subclass', ARRAY['image processing', 'graphics', 'visualization', 'rendering']),
('G06T1', 'General Purpose Processing', 'General purpose image data processing', 'G06T', 4, 'group', ARRAY['image processing', 'pixel', 'bitmap']),
('G06T3', 'Geometric Transformations', 'Geometric image transformation in the plane of the image', 'G06T', 4, 'group', ARRAY['transformation', 'scaling', 'rotation', 'geometric']),
('G06T5', 'Image Enhancement', 'Image enhancement or restoration', 'G06T', 4, 'group', ARRAY['enhancement', 'restoration', 'filtering', 'noise reduction']),
('G06T7', 'Image Analysis', 'Image analysis', 'G06T', 4, 'group', ARRAY['image analysis', 'feature detection', 'segmentation', 'object recognition']),
('G06T11', 'Drawing', '2D image generation', 'G06T', 4, 'group', ARRAY['2D graphics', 'drawing', 'rendering', 'vector graphics']),
('G06T13', 'Animation', 'Animation', 'G06T', 4, 'group', ARRAY['animation', 'motion', 'keyframe', 'interpolation']),
('G06T13/40', 'Character Animation', 'Animation of characters, e.g. humans, animals or virtual beings', 'G06T13', 5, 'subgroup', ARRAY['character animation', 'avatar', 'virtual character', 'humanoid']),
('G06T13/80', 'Facial Animation', 'Animation of facial features', 'G06T13', 5, 'subgroup', ARRAY['facial animation', 'lip sync', 'expression', 'face']),
('G06T15', '3D Rendering', '3D image rendering', 'G06T', 4, 'group', ARRAY['3D graphics', 'rendering', 'ray tracing', 'shading']),
('G06T17', '3D Modelling', 'Three dimensional (3D) modelling', 'G06T', 4, 'group', ARRAY['3D modeling', 'mesh', 'geometry', 'CAD']),
('G06T19', 'Manipulating 3D Models', 'Manipulating 3D models or images for computer graphics', 'G06T', 4, 'group', ARRAY['3D manipulation', 'virtual reality', 'augmented reality']),

-- G06V - Image/Video Recognition
('G06V', 'Image or Video Recognition', 'Image or video recognition or understanding', 'G06', 3, 'subclass', ARRAY['image recognition', 'video analysis', 'computer vision', 'object detection']),
('G06V10', 'Arranging Images', 'Arrangements for image or video recognition or understanding', 'G06V', 4, 'group', ARRAY['image arrangement', 'preprocessing', 'feature extraction']),
('G06V20', 'Scene Understanding', 'Scenes; Scene-specific elements', 'G06V', 4, 'group', ARRAY['scene understanding', 'scene recognition', 'context']),
('G06V30', 'Character Recognition', 'Character recognition; Recognising digital ink', 'G06V', 4, 'group', ARRAY['OCR', 'character recognition', 'text recognition', 'handwriting']),
('G06V40', 'Biometrics', 'Recognition of biometric, human-related or animal-related patterns', 'G06V', 4, 'group', ARRAY['biometrics', 'face recognition', 'fingerprint', 'identity']),

-- G10L - Speech Analysis/Synthesis
('G10L', 'Speech Analysis or Synthesis', 'Speech analysis or synthesis; Speech recognition', 'G10', 3, 'subclass', ARRAY['speech', 'voice', 'audio', 'TTS', 'ASR']),
('G10L13', 'Speech Synthesis', 'Speech synthesis', 'G10L', 4, 'group', ARRAY['TTS', 'text to speech', 'voice synthesis', 'speech generation']),
('G10L15', 'Speech Recognition', 'Speech recognition', 'G10L', 4, 'group', ARRAY['ASR', 'speech recognition', 'voice recognition', 'transcription']),
('G10L21', 'Speech Transformation', 'Speech transformation, e.g. pitch or formant changing', 'G10L', 4, 'group', ARRAY['voice conversion', 'pitch', 'voice transformation']),
('G10L25', 'Speech Analysis', 'Speech or voice analysis techniques', 'G10L', 4, 'group', ARRAY['speech analysis', 'audio analysis', 'prosody']),

-- H04 - Electric Communication Technique
('H04', 'Electric Communication Technique', 'Electric communication technique', NULL, 2, 'class', ARRAY['communication', 'transmission', 'network']),

-- H04L - Transmission of Digital Information
('H04L', 'Transmission of Digital Information', 'Transmission of digital information, e.g. telegraphic communication', 'H04', 3, 'subclass', ARRAY['data transmission', 'network protocol', 'internet', 'communication']),
('H04L67', 'Network Arrangements', 'Network arrangements or protocols for supporting network services or applications', 'H04L', 4, 'group', ARRAY['network service', 'application protocol', 'client-server', 'API']),

-- H04N - Pictorial Communication
('H04N', 'Pictorial Communication', 'Pictorial communication, e.g. television', 'H04', 3, 'subclass', ARRAY['video', 'television', 'multimedia', 'streaming']),
('H04N5', 'Television Systems', 'Details of television systems', 'H04N', 4, 'group', ARRAY['television', 'video system', 'broadcast']),
('H04N19', 'Video Coding', 'Methods or arrangements for coding, decoding, compressing or decompressing digital video signals', 'H04N', 4, 'group', ARRAY['video coding', 'compression', 'codec', 'encoding']),
('H04N21', 'Selective Content Distribution', 'Selective content distribution, e.g. interactive television or video on demand', 'H04N', 4, 'group', ARRAY['content distribution', 'streaming', 'VOD', 'interactive TV'])

ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  parent_code = EXCLUDED.parent_code,
  level = EXCLUDED.level,
  category = EXCLUDED.category,
  keywords = EXCLUDED.keywords;

-- Create function to calculate filing fee based on entity status and page count
CREATE OR REPLACE FUNCTION calculate_patent_filing_fee(
  p_filing_type text,
  p_entity_status text,
  p_page_count integer DEFAULT 0
)
RETURNS numeric AS $$
DECLARE
  base_fee numeric;
  size_fee numeric := 0;
  additional_sheets integer;
BEGIN
  -- Base fees for provisional application (2024 rates)
  IF p_filing_type = 'provisional' THEN
    CASE p_entity_status
      WHEN 'regular' THEN base_fee := 325;
      WHEN 'small_entity' THEN base_fee := 130;
      WHEN 'micro_entity' THEN base_fee := 65;
      ELSE base_fee := 325;
    END CASE;
  -- Base fees for non-provisional application
  ELSIF p_filing_type = 'non_provisional' THEN
    CASE p_entity_status
      WHEN 'regular' THEN base_fee := 1820;
      WHEN 'small_entity' THEN base_fee := 728;
      WHEN 'micro_entity' THEN base_fee := 364;
      ELSE base_fee := 1820;
    END CASE;
  ELSE
    base_fee := 325; -- Default to provisional
  END IF;

  -- Application size fee if over 100 sheets
  IF p_page_count > 100 THEN
    additional_sheets := CEIL((p_page_count - 100)::numeric / 50);
    CASE p_entity_status
      WHEN 'regular' THEN size_fee := additional_sheets * 450;
      WHEN 'small_entity' THEN size_fee := additional_sheets * 180;
      WHEN 'micro_entity' THEN size_fee := additional_sheets * 90;
      ELSE size_fee := additional_sheets * 450;
    END CASE;
  END IF;

  RETURN base_fee + size_fee;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to check filing checklist completeness
CREATE OR REPLACE FUNCTION check_patent_filing_readiness(p_application_id uuid)
RETURNS jsonb AS $$
DECLARE
  app_record RECORD;
  checklist jsonb := '{}';
  claims_count integer;
  independent_claims integer;
  drawings_count integer;
  inventors_count integer;
  spec_word_count integer;
  abstract_word_count integer;
BEGIN
  -- Get application data
  SELECT * INTO app_record FROM patent_applications WHERE id = p_application_id;
  
  IF NOT FOUND THEN
    RETURN '{"error": "Application not found"}'::jsonb;
  END IF;

  -- Count claims
  SELECT COUNT(*), COUNT(*) FILTER (WHERE claim_type = 'independent')
  INTO claims_count, independent_claims
  FROM patent_claims WHERE application_id = p_application_id;

  -- Count drawings
  SELECT COUNT(*) INTO drawings_count
  FROM patent_drawings WHERE application_id = p_application_id;

  -- Count inventors
  SELECT jsonb_array_length(COALESCE(app_record.inventors, '[]'::jsonb)) INTO inventors_count;

  -- Estimate word counts (rough estimate based on character count / 5)
  spec_word_count := COALESCE(LENGTH(app_record.specification) / 5, 0);
  abstract_word_count := COALESCE(LENGTH(app_record.abstract) / 5, 0);

  -- Build checklist
  checklist := jsonb_build_object(
    'title', jsonb_build_object(
      'complete', app_record.title IS NOT NULL AND LENGTH(app_record.title) > 0,
      'value', app_record.title
    ),
    'specification', jsonb_build_object(
      'complete', spec_word_count >= 100,
      'word_count', spec_word_count
    ),
    'abstract', jsonb_build_object(
      'complete', abstract_word_count > 0 AND abstract_word_count <= 150,
      'word_count', abstract_word_count,
      'valid', abstract_word_count <= 150
    ),
    'claims', jsonb_build_object(
      'complete', claims_count > 0 AND independent_claims > 0,
      'total', claims_count,
      'independent', independent_claims
    ),
    'drawings', jsonb_build_object(
      'complete', drawings_count > 0,
      'count', drawings_count
    ),
    'inventors', jsonb_build_object(
      'complete', inventors_count > 0,
      'count', inventors_count
    ),
    'entity_status', jsonb_build_object(
      'complete', app_record.entity_status IS NOT NULL,
      'value', app_record.entity_status
    ),
    'correspondence_address', jsonb_build_object(
      'complete', app_record.correspondence_address IS NOT NULL 
        AND app_record.correspondence_address != '{}'::jsonb
        AND (app_record.correspondence_address->>'street') IS NOT NULL,
      'has_data', app_record.correspondence_address != '{}'::jsonb
    ),
    'cpc_classification', jsonb_build_object(
      'complete', app_record.cpc_classifications IS NOT NULL 
        AND (app_record.cpc_classifications->>'primary') IS NOT NULL,
      'primary', app_record.cpc_classifications->>'primary'
    ),
    'ready_to_file', (
      app_record.title IS NOT NULL AND LENGTH(app_record.title) > 0
      AND spec_word_count >= 100
      AND abstract_word_count > 0 AND abstract_word_count <= 150
      AND claims_count > 0 AND independent_claims > 0
      AND drawings_count > 0
      AND inventors_count > 0
      AND app_record.entity_status IS NOT NULL
    )
  );

  RETURN checklist;
END;
$$ LANGUAGE plpgsql STABLE;
