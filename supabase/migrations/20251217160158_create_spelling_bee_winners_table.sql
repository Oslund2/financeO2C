/*
  # Create Spelling Bee Winners Table

  1. New Tables
    - `spelling_bee_winners`
      - `id` (uuid, primary key)
      - `year` (integer, required) - Competition year
      - `winning_word` (text, required) - The winning spelling word
      - `winner_name` (text) - Name of the winner
      - `definition` (text, required) - Dictionary definition
      - `part_of_speech` (text) - Noun, verb, adjective, etc.
      - `language_origin` (text) - Etymology/origin language
      - `pronunciation` (text) - Phonetic pronunciation
      - `example_sentence` (text) - Example usage
      - `difficulty_level` (text) - easy, medium, hard, expert
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `spelling_bee_winners` table
    - Add policy for authenticated users to read all data
    - Add policy for anonymous users to read all data (reference data)

  3. Indexes
    - Index on `year` for efficient sorting
    - Index on `winning_word` for searching
*/

CREATE TABLE IF NOT EXISTS spelling_bee_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  winning_word text NOT NULL,
  winner_name text,
  definition text NOT NULL,
  part_of_speech text,
  language_origin text,
  pronunciation text,
  example_sentence text,
  difficulty_level text DEFAULT 'medium',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT spelling_bee_winners_year_unique UNIQUE (year, winning_word),
  CONSTRAINT spelling_bee_winners_difficulty_check CHECK (difficulty_level IN ('easy', 'medium', 'hard', 'expert'))
);

CREATE INDEX IF NOT EXISTS idx_spelling_bee_winners_year ON spelling_bee_winners(year DESC);
CREATE INDEX IF NOT EXISTS idx_spelling_bee_winners_word ON spelling_bee_winners(winning_word);

ALTER TABLE spelling_bee_winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read spelling bee winners"
  ON spelling_bee_winners
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE OR REPLACE FUNCTION update_spelling_bee_winners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER spelling_bee_winners_updated_at
  BEFORE UPDATE ON spelling_bee_winners
  FOR EACH ROW
  EXECUTE FUNCTION update_spelling_bee_winners_updated_at();