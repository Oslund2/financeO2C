import { supabase } from '../lib/supabase';

export const SAMPLE_CHARACTERS = [
  {
    name: 'Barnaby',
    age: 10,
    description: 'The main protagonist. A worrywart who rises to challenges.',
    personality: 'Anxious but determined. Overthinks everything but rises to challenges when it matters. His anxiety manifests physically in his clay form.',
    clay_features: 'Head literally inflates slightly when he knows a big word and deflates with a squeak when panicked. Sweats little clay droplets when nervous. Can shrink to grape size when terrified.',
    voice_characteristics: 'High pitched squeak when nervous, normal voice when confident',
    tags: ['protagonist', 'anxious', 'smart', 'determined', 'main-cast'],
    reference_image_url: 'https://uajbsnklagqyjrqebppp.supabase.co/storage/v1/object/public/character-images/characters/barnaby_1765153324994.jpg',
    role: 'Primary',
  },
  {
    name: 'Zora',
    age: 10,
    description: 'High energy girl with spring-like coiled limbs. Cannot stand still.',
    personality: 'Cannot stand still. Hyperactive and optimistic. Spells while performing acrobatics. Always positive and supportive of friends.',
    clay_features: 'Limbs are spring-like coils. Vibrates so hard her chair hops. Can bounce, stretch dramatically, and perform backflips and cartwheels.',
    voice_characteristics: 'Energetic, fast-paced, enthusiastic, loud and encouraging',
    tags: ['energetic', 'acrobatic', 'optimistic', 'athletic', 'main-cast'],
    reference_image_url: 'https://uajbsnklagqyjrqebppp.supabase.co/storage/v1/object/public/character-images/characters/zora_1765153443205.jpg',
    role: 'Ensemble',
  },
  {
    name: 'Kenji',
    age: 11,
    description: 'Cool, tech-obsessed speller who views spelling like hacking',
    personality: 'Analytical and methodical. Views spelling like hacking a computer mainframe. Always calm under pressure. Logical and supportive.',
    clay_features: 'Eyes are little glowing screens that display letters and data. Can project holographic letters. Taps on a clay tablet.',
    voice_characteristics: 'Calm, measured, tech-savvy tone, analytical',
    tags: ['tech', 'analytical', 'cool', 'logical', 'main-cast'],
    reference_image_url: 'https://uajbsnklagqyjrqebppp.supabase.co/storage/v1/object/public/character-images/characters/kenji_1765153496097.jpg',
    role: 'Ensemble',
  },
  {
    name: 'Maya',
    age: 9,
    description: 'Artistic and dreamy speller who sees words as colors',
    personality: 'Sees words as colors and sculptures. Very creative and imaginative. Floats when deep in thought. Perceives words synesthetically.',
    clay_features: 'Hair changes color based on the vibe of the word. Surrounded by a colorful aura when spelling. Can float. Paintings come to life.',
    voice_characteristics: 'Soft, dreamy, artistic tone, ethereal',
    tags: ['artistic', 'creative', 'dreamy', 'colorful', 'main-cast'],
    reference_image_url: 'https://uajbsnklagqyjrqebppp.supabase.co/storage/v1/object/public/character-images/characters/maya_1765153519672.jpg',
    role: 'Ensemble',
  },
  {
    name: 'Mrs. Higginbottom',
    age: null,
    description: 'Eccentric school librarian and spelling coach who moves on wheels',
    personality: 'Enthusiastic about words and education. Slightly quirky but deeply caring. Pushes students to excel. Theatrical and encouraging.',
    clay_features: 'Moves on wheels like a library cart. Can roll at high speeds. Hair styled like a card catalog. Honks a horn.',
    voice_characteristics: 'Authoritative but warm, slightly theatrical, encouraging',
    tags: ['teacher', 'coach', 'eccentric', 'supportive', 'main-cast'],
    reference_image_url: 'https://uajbsnklagqyjrqebppp.supabase.co/storage/v1/object/public/character-images/characters/mrs__higginbottom_1765153361901.jpg',
    role: 'Primary',
  },
  {
    name: 'Chad',
    age: 11,
    description: 'Rival speller with perfect plastic-looking hair',
    personality: 'Smug and competitive. Takes pleasure in others failures. Eventually shows sportsmanship after losing.',
    clay_features: 'Hair is molded into a perfect, immovable plastic-looking wave that droops under pressure. Melts into a puddle when defeated.',
    voice_characteristics: 'Smug, condescending, confident bordering on arrogant',
    tags: ['antagonist', 'rival', 'competitive', 'recurring'],
    reference_image_url: 'https://uajbsnklagqyjrqebppp.supabase.co/storage/v1/object/public/character-images/characters/chad_1765153387406.jpg',
    role: 'Primary',
  },
  {
    name: 'Host',
    age: null,
    description: 'Clay version of LeVar Burton hosting the National Spelling Bee Finals',
    personality: 'Professional, encouraging, and enthusiastic about literacy and learning.',
    clay_features: 'Styled as a clay representation of LeVar Burton. Professional appearance.',
    voice_characteristics: 'Warm, professional, encouraging, authoritative',
    tags: ['host', 'professional', 'supportive', 'cameo'],
    reference_image_url: 'https://uajbsnklagqyjrqebppp.supabase.co/storage/v1/object/public/character-images/characters/host_1765153413505.jpg',
    role: 'Recurring',
  },
];

export const SPELL_MAGEDDON_SCRIPT = {
  title: 'Spell-Mageddon!',
  episode_number: 1,
  season_number: 1,
  runtime_minutes: 22,
  synopsis: 'Barnaby faces his worst nightmare when he must compete in the school spelling bee qualifier. Despite his anxiety causing his clay head to deflate, he and his friends Zora, Kenji, and Maya advance through the regional competition to the national finals on ION. With the help of his supportive friends, Barnaby overcomes his fears and wins the championship, proving that teamwork and believing in yourself can conquer even the most intimidating words.',
  theme: 'Overcoming anxiety through friendship and perseverance',
  vocabulary_words: [
    'PNEUMONOULTRAMICROSCOPICSILICOVOLCANOCONIOSIS',
    'BUOYANT',
    'CRYPTOGRAPHY',
    'LUMINESCENT',
    'SESQUIPEDALIAN',
    'KNAPSACK',
    'SCHADENFREUDE',
    'ONOMATOPOEIA',
    'APPOGGIATURA',
    'LOGORRHEA',
  ],
};

export const SPELL_MAGEDDON_ACTS = [
  {
    act_number: 1,
    content: `TEASER

INT. SCHOOL AUDITORIUM - DAY

A lone spotlight hits a microphone stand made of gnarled pencils. The background is dark, just rows of terrified clay eyes watching. BARNABY stands at the mic, sweating little clay droplets. His head is shrunk down to the size of a grape.

MRS. HIGGINBOTTOM (O.S.): Your word, Barnaby, is... "PNEUMONOULTRAMICROSCOPICSILICOVOLCANOCONIOSIS."

Barnaby's eyes bug out of his head on stalks. The microphone grows teeth and growls at him.

BARNABY (High pitched squeak): Can I get a definition, please?

MRS. HIGGINBOTTOM (O.S.): No time! Spell or be squished!

A giant clay dictionary falls from the ceiling toward Barnaby.

SMASH CUT TO:

INT. BARNABY'S BEDROOM - DAY

Barnaby jolts awake in bed, gasping. His alarm clock (shaped like an owl) rings "SPELL! SPELL! SPELL!"

BARNABY: Only a dream. Only a horrible, multi-syllabic dream. Today's just the school qualifier. No big deal.

His head immediately shrinks with anxiety.

BARNABY (CONT'D): Oh boy.

---

ACT ONE

INT. SCHOOL GYM - DAY

Bright fluorescent lighting. A banner reads: "CLAYVILLE SCHOOL SPELLING BEE – QUALIFY OR CRY TRYING!" The four friends prepare for the qualifier.

The school spelling bee begins. Zora spells BUOYANT with a backflip. Kenji calmly spells CRYPTOGRAPHY. Maya floats to spell LUMINESCENT. Barnaby faces SESQUIPEDALIAN - a word that manifests as a giant scary clay monster made of tangled letters. With encouragement from his friends, he imagines the monster in silly underpants, giggles, and spells it correctly.

MRS. HIGGINBOTTOM: Correct! You four are going to Regionals!

The four friends group-hug, squishing together into one big blob of excited clay.`,
    duration_estimate: 420,
    notes: 'Establishes characters, their clay abilities, and the main conflict. Introduces the nightmare motif and word manifestations.',
  },
  {
    act_number: 2,
    content: `ACT TWO

INT. LIBRARY - DAY - TRAINING MONTAGE

Fast-paced music. The gang is in intense training: Zora jogs on a treadmill balancing a dictionary, Kenji has clay letters pumped into his ears, Maya paints living words, and Barnaby does "brain pushups" with his inflating/deflating head.

The four are exhausted, lying in a puddle of melted clay on the floor.

Mrs. Higginbottom rolls in with BRAINY BITES snacks. The kids re-energize.

INT. REGIONAL AUDITORIUM - STAGE - LATER

The regional competition is bigger and scarier. Rival CHAD sneers at them about melting under pressure. Kids are eliminated rapidly, falling through trapdoors.

It comes down to Chad, Barnaby, and Zora. Zora misspells KNAPSACK (missing the silent K) and falls through a trapdoor. Chad smugly spells SCHADENFREUDE correctly.

ANNOUNCER (V.O.): Barnaby. To stay in the game and advance to the National Finals on ION. Your word is... "ONOMATOPOEIA."

The word appears making noises: "Buzz! Hiss! Bang!" The trapdoor creaks open under Barnaby's feet.`,
    duration_estimate: 480,
    notes: 'Training montage shows character growth. Regional competition raises stakes. Cliffhanger ending.',
  },
  {
    act_number: 3,
    content: `ACT THREE

INT. REGIONAL AUDITORIUM - CONTINUOUS

Barnaby teeters on the trapdoor edge. The "Onomatopoeia" word-monster buzzes in his face. His friends signal him: Zora bounces, Kenji makes calm gestures, Maya points to her ear.

BARNABY (Thinking): Listen to the word. The word is the sound.

He closes his eyes, mimics the sounds, and spells ONOMATOPOEIA correctly! The trapdoor snaps shut.

ANNOUNCER: Correct! Barnaby and Chad are moving on to the NATIONAL FINALS!

INT. THE BIG STAGE (ION FINALS) - NIGHT

The Scripps National Spelling Bee Finals stage is grand with ION logos everywhere. The HOST (clay LeVar Burton) welcomes them.

Chad goes first with APPOGGIATURA but cracks under pressure, misspelling it. He melts into a puddle of shame.

HOST: Barnaby, if you spell this word correctly, you are the champion. Your word is... "LOGORRHEA."

Barnaby's head shrinks fast. The word manifests as a giant slobbering clay mouth spewing endless words. Barnaby looks to his friends and channels their techniques - bouncing (Zora), scanning (Kenji), seeing colors (Maya). He spells LOGORRHEA correctly!

Confetti cannons blast! Zora, Kenji, and Maya tackle Barnaby in a huge clay pile-up. Mrs. Higginbottom rolls in honking. Even Chad reforms and offers a handshake.

TAG

INT. SCHOOL CLASSROOM - DAY

Back in class with pizza and the trophy. Mrs. Higginbottom asks Barnaby to spell "Cat." Relaxed, he spells it "K-A-T." Everyone stares. His head shrinks with embarrassment. The class laughs.

IRIS OUT on Barnaby's tiny, embarrassed head.`,
    duration_estimate: 540,
    notes: 'Climactic spelling bee victory. Character growth arc completes. Comic relief tag ending.',
  },
];

export const STORYBOARD_ASSETS = [
  {
    asset_type: 'scene_image',
    name: 'The Nightmare - Falling Dictionary',
    description: 'Key storyboard scene from the teaser sequence',
    generation_prompt: 'A claymation still from a nightmare sequence. A terrified young boy, BARNABY, stands on a dark stage under a harsh spotlight. His head is comically shrunken to the size of a grape. A giant, monstrous dictionary made of dark, gnarled clay with jagged teeth is falling from the ceiling directly toward him. The style is tactile, scary but silly stop-motion. Visible fingerprints, matte finish clay, miniature set lighting with hard shadows.',
    tags: ['storyboard', 'teaser', 'nightmare', 'spell-mageddon', 'key-scene'],
  },
  {
    asset_type: 'scene_image',
    name: 'The Word Monster - Sesquipedalian',
    description: 'The physical manifestation of a difficult word as a monster',
    generation_prompt: 'A claymation wide shot of a school gym stage during a spelling bee. BARNABY is cowering at a microphone. Floating above him is a physical manifestation of a difficult word: a giant, messy, scary monster sculpted entirely out of tangled, sharp-looking clay alphabet letters scowling at him. A banner behind reads "CLAYVILLE SPELLING BEE." Visible fingerprints, squash and stretch physics, miniature set lighting.',
    tags: ['storyboard', 'act-one', 'word-monster', 'spell-mageddon', 'key-scene'],
  },
  {
    asset_type: 'scene_image',
    name: 'Training Snack Break - Brainy Bites',
    description: 'The team refueling during training montage',
    generation_prompt: 'A claymation medium shot in a school library. Four diverse clay children (Barnaby, high-energy sporty girl Zora, robotic boy Kenji, artistic girl Maya) are gathered around a table, looking tired. A teacher character, Mrs. Higginbottom (who rolls on cart wheels), is offering them a bowl of colorful clay fruit snacks. Next to the bowl is a clay box with the words "BRAINY BITES" written in fun, child-friendly letters. The lighting is bright and warm. Visible fingerprints on all clay models.',
    tags: ['storyboard', 'act-two', 'training', 'spell-mageddon', 'key-scene'],
  },
  {
    asset_type: 'scene_image',
    name: 'ION Finals Stage',
    description: 'The grand national finals stage',
    generation_prompt: 'A wide-angle claymation landscape shot of the Scripps National Spelling Bee finals stage. The set is grand, decked out in blue and gold clay decorations. The "ION" television network logo is prominently displayed on large clay screens in the background and on the central lectern. Barnaby stands center stage looking very small. The lighting is dramatic television studio lighting, but rendered in miniature. Stop-motion claymation style with visible textures.',
    tags: ['storyboard', 'act-three', 'finals', 'spell-mageddon', 'key-scene'],
  },
  {
    asset_type: 'scene_image',
    name: 'Victory Pile-Up',
    description: 'The triumphant group celebration',
    generation_prompt: 'A joyous claymation action shot on a stage. Confetti made of small clay bits is raining down. Three clay children (Zora, Kenji, Maya) are tackling Barnaby in a massive, squishy group hug, forming a single blob of happy, mixed-colored clay. They are all laughing. A large golden clay trophy is visible near them. The style is energetic and messy. Squash and stretch physics, visible fingerprints, celebratory lighting.',
    tags: ['storyboard', 'act-three', 'victory', 'spell-mageddon', 'key-scene'],
  },
  {
    asset_type: 'prop',
    name: 'Golden Spelling Bee Trophy',
    description: 'The championship trophy for the National Spelling Bee',
    generation_prompt: 'A claymation prop: an ornate golden trophy made of shiny gold-colored clay. The trophy features a bee sculpted on top with "NATIONAL SPELLING BEE CHAMPION" engraved on the base. Visible fingerprints and hand-sculpted details. Miniature scale for stop-motion animation. Matte and metallic finish textures.',
    tags: ['prop', 'trophy', 'finals', 'spell-mageddon'],
  },
  {
    asset_type: 'prop',
    name: 'Stage Microphone',
    description: 'Vintage-style microphone for spelling bee contestants',
    generation_prompt: 'A claymation prop: a vintage-style microphone on a stand made of clay. Silver/chrome colored clay for the microphone head, black clay stand. Miniature scale suitable for clay character interaction. Tactile, hand-sculpted appearance with visible fingerprints. Stop-motion animation ready.',
    tags: ['prop', 'microphone', 'stage', 'spell-mageddon'],
  },
  {
    asset_type: 'prop',
    name: 'Dictionary Stack',
    description: 'Stack of old dictionaries and word books',
    generation_prompt: 'A claymation prop: a stack of 3-4 old clay dictionaries with worn covers. Various earth tones and muted colors. Titles like "WEBSTER\'S", "OXFORD", and "WORDS" visible on spines. Miniature scale, tactile clay texture with visible fingerprints. Stop-motion friendly with slight squash and tilt.',
    tags: ['prop', 'books', 'library', 'spell-mageddon'],
  },
  {
    asset_type: 'prop',
    name: 'Study Flashcards',
    description: 'Colorful vocabulary flashcards for studying',
    generation_prompt: 'A claymation prop: a deck of colorful clay flashcards spread out on a surface. Each card shows a difficult spelling word in bold letters. Bright primary colors (red, blue, yellow, green). Miniature scale, flat clay cards with crisp edges. Visible hand-sculpted texture.',
    tags: ['prop', 'flashcards', 'study', 'spell-mageddon'],
  },
  {
    asset_type: 'prop',
    name: 'Brainy Bites Snack Box',
    description: 'Colorful box of brain-boosting snacks',
    generation_prompt: 'A claymation prop: a bright, colorful clay snack box labeled "BRAINY BITES" in fun, bubbly lettering. The box is open showing colorful clay fruit snacks inside. Primary colors with a playful design. Miniature scale, tactile clay texture. Perfect for stop-motion animation.',
    tags: ['prop', 'snacks', 'training', 'spell-mageddon'],
  },
  {
    asset_type: 'background',
    name: 'School Gymnasium Stage',
    description: 'Interior of school gym set up for spelling bee',
    generation_prompt: 'A claymation background: the interior of a school gymnasium converted for a spelling bee competition. Wooden floor, folding chairs for audience, a raised stage with podium and microphone. Banner reading "CLAYVILLE SPELLING BEE". Basketball hoops visible in background. Warm lighting, miniature scale, tactile clay construction with visible textures and fingerprints.',
    tags: ['background', 'gym', 'school', 'spell-mageddon'],
  },
  {
    asset_type: 'background',
    name: 'School Library Interior',
    description: 'Cozy library with bookshelves and study tables',
    generation_prompt: 'A claymation background: a warm, inviting school library interior. Tall clay bookshelves filled with colorful book spines line the walls. Wooden study tables with chairs in the center. Soft, warm lighting from clay table lamps. Windows showing daylight. Miniature scale with hand-sculpted details and visible fingerprints. Stop-motion animation friendly.',
    tags: ['background', 'library', 'school', 'spell-mageddon'],
  },
  {
    asset_type: 'background',
    name: 'National Finals Stage',
    description: 'Grand stage for the national spelling bee championship',
    generation_prompt: 'A claymation background: the grand stage of the National Spelling Bee finals. Professional television set with multiple cameras, bright stage lights, large screens displaying the "ION" network logo. Blue and gold decorations. A professional lectern at center stage. Stadium seating for audience. Dramatic lighting, miniature scale, highly detailed clay construction.',
    tags: ['background', 'finals', 'stage', 'spell-mageddon'],
  },
  {
    asset_type: 'background',
    name: 'Classroom Interior',
    description: 'Standard elementary school classroom',
    generation_prompt: 'A claymation background: a cheerful elementary school classroom. Rows of small clay desks with chairs, a teacher\'s desk at front, colorful alphabet posters on walls, a chalkboard with spelling words written on it. Bright, even classroom lighting. Window showing daylight. Miniature scale with tactile clay textures and hand-sculpted details.',
    tags: ['background', 'classroom', 'school', 'spell-mageddon'],
  },
  {
    asset_type: 'background',
    name: 'Nightmare Void Stage',
    description: 'Dark, empty stage for nightmare sequence',
    generation_prompt: 'A claymation background: a dark, ominous void with a single harsh spotlight illuminating a small stage area. Black or very dark purple clay background fading to nothing. The spotlight creates dramatic shadows. Minimalist, scary but not too frightening. Perfect for nightmare sequences. Miniature scale, stop-motion animation ready.',
    tags: ['background', 'nightmare', 'dark', 'spell-mageddon'],
  },
];

const SAMPLE_CHARACTER_NAMES = SAMPLE_CHARACTERS.map((c) => c.name);
const SAMPLE_SCRIPT_TITLE = SPELL_MAGEDDON_SCRIPT.title;
const SAMPLE_ASSET_NAMES = STORYBOARD_ASSETS.map((a) => a.name);

/**
 * Removes Spelling Bee sample data that was accidentally seeded into series
 * belonging to non-claymation workspaces.
 */
export async function cleanupMisseededSampleData(organizationId: string) {
  try {
    const { data: seriesList } = await supabase
      .from('series')
      .select('id')
      .eq('organization_id', organizationId);

    if (!seriesList || seriesList.length === 0) return;

    const seriesIds = seriesList.map((s) => s.id);

    // Remove sample characters
    const { error: charErr } = await supabase
      .from('characters')
      .delete()
      .in('series_id', seriesIds)
      .in('name', SAMPLE_CHARACTER_NAMES);
    if (charErr) console.error('Cleanup – characters:', charErr.message);

    // Find the sample script(s)
    const { data: sampleScripts } = await supabase
      .from('scripts')
      .select('id')
      .in('series_id', seriesIds)
      .eq('title', SAMPLE_SCRIPT_TITLE);

    if (sampleScripts && sampleScripts.length > 0) {
      const scriptIds = sampleScripts.map((s) => s.id);

      // Remove acts
      await supabase.from('script_acts').delete().in('script_id', scriptIds);

      // Remove episodes tied to these scripts
      const { error: epErr } = await supabase
        .from('episodes')
        .delete()
        .in('series_id', seriesIds)
        .in('script_id', scriptIds);
      if (epErr) console.error('Cleanup – episodes:', epErr.message);

      // Remove scripts
      await supabase.from('scripts').delete().in('id', scriptIds);
    }

    // Remove sample assets by name
    const { error: assetErr } = await supabase
      .from('assets')
      .delete()
      .in('series_id', seriesIds)
      .in('name', SAMPLE_ASSET_NAMES);
    if (assetErr) console.error('Cleanup – assets:', assetErr.message);

    console.log('Sample data cleanup complete for org:', organizationId);
  } catch (error) {
    console.error('Error during sample data cleanup:', error);
  }
}

export async function initializeSampleData(seriesId: string) {
  try {
    const { data: existingData } = await supabase
      .from('characters')
      .select('id')
      .eq('series_id', seriesId)
      .limit(1);

    if (existingData && existingData.length > 0) {
      console.log('Sample data already exists');
      return;
    }

    const charactersWithSeriesId = SAMPLE_CHARACTERS.map((char) => ({
      ...char,
      series_id: seriesId,
    }));

    const { data: insertedCharacters, error: charError } = await supabase
      .from('characters')
      .insert(charactersWithSeriesId)
      .select();

    if (charError) throw charError;

    const scriptData = {
      series_id: seriesId,
      ...SPELL_MAGEDDON_SCRIPT,
      status: 'approved',
      ai_generated: false,
    };

    const { data: insertedScript, error: scriptError } = await supabase
      .from('scripts')
      .insert([scriptData])
      .select()
      .single();

    if (scriptError) throw scriptError;

    const actsWithScriptId = SPELL_MAGEDDON_ACTS.map((act) => ({
      ...act,
      script_id: insertedScript.id,
    }));

    const { error: actsError } = await supabase
      .from('script_acts')
      .insert(actsWithScriptId);

    if (actsError) throw actsError;

    const assetsWithSeriesId = STORYBOARD_ASSETS.map((asset) => ({
      ...asset,
      series_id: seriesId,
      ai_generated: false,
    }));

    const { error: assetsError } = await supabase
      .from('assets')
      .insert(assetsWithSeriesId);

    if (assetsError) throw assetsError;

    const episodeData = {
      series_id: seriesId,
      script_id: insertedScript.id,
      title: 'Spell-Mageddon!',
      status: 'script',
      progress_percentage: 20,
      production_notes: 'Script complete. Ready for asset generation and voice recording. Storyboard key scenes identified.',
    };

    const { error: episodeError } = await supabase
      .from('episodes')
      .insert([episodeData]);

    if (episodeError) throw episodeError;

    console.log('Spell-Mageddon! episode data created successfully');
    console.log('- Characters:', insertedCharacters?.length);
    console.log('- Script with 3 acts');
    console.log('- 5 storyboard asset prompts');
    console.log('- Episode production entry');
  } catch (error) {
    console.error('Error initializing sample data:', error);
  }
}
