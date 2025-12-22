/*
  # Seed IP Reference Data

  1. Data Seeded
    - Nice Classification (all 45 classes for trademark classification)
    - Copyright Treaties (major countries and their treaty memberships)
    - AI Tool Registry (common AI tools used in content creation)

  2. Purpose
    - Provides reference data for trademark classification
    - Enables international copyright protection analysis
    - Documents common AI tools for authorship tracking
*/

-- Seed Nice Classification (All 45 Classes)
INSERT INTO nice_classifications (class_number, class_heading, class_description, example_goods_services, common_terms) VALUES
(1, 'Chemicals', 'Chemicals for use in industry, science and photography, as well as in agriculture, horticulture and forestry', ARRAY['adhesives', 'fertilizers', 'fire extinguishing compositions'], ARRAY['chemical', 'industrial', 'scientific']),
(2, 'Paints', 'Paints, varnishes, lacquers; preservatives against rust and against deterioration of wood', ARRAY['paints', 'coatings', 'colorants'], ARRAY['paint', 'varnish', 'coating']),
(3, 'Cosmetics and Cleaning', 'Non-medicated cosmetics and toiletry preparations; cleaning, polishing, scouring preparations', ARRAY['soaps', 'perfumes', 'cosmetics', 'cleaning preparations'], ARRAY['cosmetic', 'beauty', 'cleaning']),
(4, 'Lubricants and Fuels', 'Industrial oils and greases, wax; lubricants; dust absorbing, wetting and binding compositions; fuels', ARRAY['motor fuel', 'lubricating oil', 'candles'], ARRAY['oil', 'fuel', 'lubricant']),
(5, 'Pharmaceuticals', 'Pharmaceuticals, medical and veterinary preparations; sanitary preparations for medical purposes', ARRAY['medicines', 'vitamins', 'bandages', 'diapers'], ARRAY['pharmaceutical', 'medical', 'drug']),
(6, 'Metal Goods', 'Common metals and their alloys, ores; metal materials for building and construction', ARRAY['pipes', 'cables', 'hardware', 'safes'], ARRAY['metal', 'hardware', 'building materials']),
(7, 'Machinery', 'Machines, machine tools, power-operated tools; motors and engines', ARRAY['motors', 'pumps', 'robots', 'machine tools'], ARRAY['machine', 'motor', 'engine']),
(8, 'Hand Tools', 'Hand tools and implements, hand-operated; cutlery; side arms, except firearms; razors', ARRAY['knives', 'forks', 'scissors', 'razors'], ARRAY['tool', 'cutlery', 'blade']),
(9, 'Electrical and Scientific', 'Scientific, research, navigation, surveying, photographic, cinematographic, audiovisual, optical apparatus; computers and software', ARRAY['computers', 'software', 'mobile apps', 'downloadable content', 'video games', 'streaming media'], ARRAY['software', 'app', 'computer', 'electronic', 'digital']),
(10, 'Medical Apparatus', 'Surgical, medical, dental and veterinary apparatus and instruments', ARRAY['surgical instruments', 'prosthetics', 'hearing aids'], ARRAY['medical device', 'surgical', 'therapeutic']),
(11, 'Environmental Control', 'Apparatus and installations for lighting, heating, cooling, steam generating, cooking, drying, ventilating', ARRAY['lamps', 'air conditioners', 'refrigerators', 'ovens'], ARRAY['lighting', 'heating', 'cooling']),
(12, 'Vehicles', 'Vehicles; apparatus for locomotion by land, air or water', ARRAY['automobiles', 'bicycles', 'aircraft', 'boats'], ARRAY['vehicle', 'car', 'transportation']),
(13, 'Firearms', 'Firearms; ammunition and projectiles; explosives; fireworks', ARRAY['guns', 'ammunition', 'fireworks'], ARRAY['firearm', 'ammunition', 'explosive']),
(14, 'Jewelry', 'Precious metals and their alloys; jewelry, precious and semi-precious stones; horological and chronometric instruments', ARRAY['watches', 'jewelry', 'precious metals'], ARRAY['jewelry', 'watch', 'precious']),
(15, 'Musical Instruments', 'Musical instruments; music stands and stands for musical instruments; conductors batons', ARRAY['guitars', 'pianos', 'drums'], ARRAY['instrument', 'musical', 'music']),
(16, 'Paper Goods and Printed Matter', 'Paper and cardboard; printed matter; bookbinding material; photographs; stationery and office requisites', ARRAY['books', 'magazines', 'stationery', 'posters'], ARRAY['paper', 'print', 'publication', 'book']),
(17, 'Rubber Goods', 'Unprocessed and semi-processed rubber, gutta-percha, gum, asbestos, mica and substitutes', ARRAY['rubber sheets', 'plastic tubes', 'insulating materials'], ARRAY['rubber', 'plastic', 'insulation']),
(18, 'Leather Goods', 'Leather and imitations of leather; animal skins and hides; luggage and carrying bags', ARRAY['luggage', 'handbags', 'wallets', 'umbrellas'], ARRAY['leather', 'bag', 'luggage']),
(19, 'Building Materials', 'Materials, not of metal, for building and construction; rigid pipes, not of metal, for building', ARRAY['cement', 'concrete', 'wood', 'glass'], ARRAY['construction', 'building', 'material']),
(20, 'Furniture', 'Furniture, mirrors, picture frames; containers, not of metal, for storage or transport', ARRAY['chairs', 'tables', 'beds', 'shelves'], ARRAY['furniture', 'container', 'frame']),
(21, 'Household Items', 'Household or kitchen utensils and containers; cookware and tableware; combs and sponges; brushes', ARRAY['dishes', 'glassware', 'brushes', 'toothbrushes'], ARRAY['kitchen', 'household', 'utensil']),
(22, 'Cordage and Fibers', 'Ropes and string; nets; tents and tarpaulins; awnings of textile or synthetic materials; sails', ARRAY['ropes', 'nets', 'tents', 'sails'], ARRAY['rope', 'tent', 'fiber']),
(23, 'Yarns and Threads', 'Yarns and threads for textile use', ARRAY['cotton thread', 'wool yarn', 'silk thread'], ARRAY['yarn', 'thread', 'textile']),
(24, 'Fabrics', 'Textiles and substitutes for textiles; household linen; curtains of textile or plastic', ARRAY['fabrics', 'bedding', 'tablecloths', 'curtains'], ARRAY['fabric', 'textile', 'linen']),
(25, 'Clothing', 'Clothing, footwear, headwear', ARRAY['shirts', 'pants', 'shoes', 'hats'], ARRAY['clothing', 'apparel', 'footwear']),
(26, 'Fancy Goods', 'Lace, braid and embroidery, and haberdashery ribbons and bows; buttons, hooks and eyes, pins and needles', ARRAY['buttons', 'zippers', 'badges', 'artificial flowers'], ARRAY['button', 'zipper', 'embroidery']),
(27, 'Floor Coverings', 'Carpets, rugs, mats and matting, linoleum and other materials for covering existing floors', ARRAY['carpets', 'rugs', 'mats', 'wallpaper'], ARRAY['carpet', 'rug', 'flooring']),
(28, 'Toys and Sporting Goods', 'Games, toys and playthings; video game apparatus; gymnastic and sporting articles', ARRAY['toys', 'games', 'sporting goods', 'video game consoles'], ARRAY['toy', 'game', 'sport']),
(29, 'Meats and Processed Foods', 'Meat, fish, poultry and game; meat extracts; preserved, frozen, dried and cooked fruits and vegetables', ARRAY['meat', 'fish', 'dairy', 'preserved foods'], ARRAY['meat', 'dairy', 'processed food']),
(30, 'Staple Foods', 'Coffee, tea, cocoa and artificial coffee; rice, pasta and noodles; flour; bread, pastries and confectionery', ARRAY['coffee', 'tea', 'bread', 'candy', 'spices'], ARRAY['coffee', 'tea', 'bakery', 'confectionery']),
(31, 'Natural Agricultural Products', 'Raw and unprocessed agricultural, aquacultural, horticultural and forestry products; raw and unprocessed grains and seeds', ARRAY['fresh fruits', 'vegetables', 'seeds', 'live animals'], ARRAY['fresh', 'agricultural', 'plant']),
(32, 'Light Beverages', 'Beers; non-alcoholic beverages; mineral and aerated waters; fruit beverages and fruit juices', ARRAY['beer', 'soft drinks', 'water', 'energy drinks'], ARRAY['beverage', 'drink', 'beer', 'water']),
(33, 'Wines and Spirits', 'Alcoholic beverages, except beers; alcoholic preparations for making beverages', ARRAY['wine', 'spirits', 'liquors', 'cocktails'], ARRAY['wine', 'spirits', 'alcohol']),
(34, 'Smokers Articles', 'Tobacco and tobacco substitutes; cigarettes, cigars and cigarillos; electronic cigarettes', ARRAY['tobacco', 'cigarettes', 'lighters', 'ashtrays'], ARRAY['tobacco', 'cigarette', 'smoking']),
(35, 'Advertising and Business', 'Advertising; business management, organization and administration; office functions', ARRAY['advertising services', 'retail services', 'business consulting', 'online retail'], ARRAY['advertising', 'marketing', 'retail', 'business']),
(36, 'Insurance and Financial', 'Financial, monetary and banking services; insurance services; real estate services', ARRAY['banking', 'insurance', 'real estate', 'investment'], ARRAY['financial', 'insurance', 'banking']),
(37, 'Construction and Repair', 'Construction services; installation and repair services; mining extraction, oil and gas drilling', ARRAY['construction', 'repair', 'installation', 'maintenance'], ARRAY['construction', 'repair', 'installation']),
(38, 'Telecommunications', 'Telecommunications services', ARRAY['broadcasting', 'streaming', 'internet access', 'video conferencing'], ARRAY['telecom', 'broadcasting', 'streaming']),
(39, 'Transportation and Storage', 'Transport; packaging and storage of goods; travel arrangement', ARRAY['shipping', 'delivery', 'storage', 'travel booking'], ARRAY['transport', 'shipping', 'travel']),
(40, 'Material Treatment', 'Treatment of materials; recycling of waste and trash; air purification and treatment of water', ARRAY['printing', 'custom manufacturing', 'recycling'], ARRAY['treatment', 'processing', 'manufacturing']),
(41, 'Education and Entertainment', 'Education; providing of training; entertainment; sporting and cultural activities', ARRAY['entertainment services', 'education', 'training', 'publishing', 'film production', 'television production', 'online content', 'streaming entertainment'], ARRAY['entertainment', 'education', 'training', 'publishing', 'film', 'television']),
(42, 'Computer and Scientific Services', 'Scientific and technological services and research and design relating thereto; industrial analysis, industrial research and industrial design services; software development', ARRAY['software development', 'web hosting', 'cloud computing', 'IT consulting', 'SaaS'], ARRAY['software', 'technology', 'IT', 'design', 'cloud']),
(43, 'Food Services', 'Services for providing food and drink; temporary accommodation', ARRAY['restaurants', 'hotels', 'catering', 'bars'], ARRAY['restaurant', 'hotel', 'food service']),
(44, 'Medical and Beauty Services', 'Medical services; veterinary services; hygienic and beauty care for human beings or animals', ARRAY['medical care', 'beauty salon', 'spa services'], ARRAY['medical', 'health', 'beauty']),
(45, 'Legal and Security Services', 'Legal services; security services for the physical protection of tangible property and individuals; personal and social services', ARRAY['legal services', 'security services', 'licensing'], ARRAY['legal', 'security', 'licensing'])
ON CONFLICT (class_number) DO UPDATE SET
  class_heading = EXCLUDED.class_heading,
  class_description = EXCLUDED.class_description,
  example_goods_services = EXCLUDED.example_goods_services,
  common_terms = EXCLUDED.common_terms;

-- Seed Copyright Treaties (Major Countries)
INSERT INTO copyright_treaties (country_code, country_name, berne_member, berne_join_date, wipo_wct_member, trips_member, registration_required, term_of_protection_years, term_basis, enforcement_strength, copyright_office_url) VALUES
('US', 'United States', true, '1989-03-01', true, true, false, 70, 'life_plus', 'very_strong', 'https://copyright.gov'),
('GB', 'United Kingdom', true, '1887-12-05', true, true, false, 70, 'life_plus', 'very_strong', 'https://www.gov.uk/copyright'),
('CA', 'Canada', true, '1928-04-10', true, true, false, 70, 'life_plus', 'strong', 'https://www.ic.gc.ca/eic/site/cipointernet-internetopic.nsf/eng/h_wr02281.html'),
('AU', 'Australia', true, '1928-04-14', true, true, false, 70, 'life_plus', 'strong', 'https://www.ipaustralia.gov.au'),
('DE', 'Germany', true, '1887-12-05', true, true, false, 70, 'life_plus', 'very_strong', 'https://www.dpma.de'),
('FR', 'France', true, '1887-12-05', true, true, false, 70, 'life_plus', 'very_strong', 'https://www.inpi.fr'),
('JP', 'Japan', true, '1899-07-15', true, true, false, 70, 'life_plus', 'strong', 'https://www.bunka.go.jp'),
('CN', 'China', true, '1992-10-15', true, true, false, 50, 'life_plus', 'moderate', 'https://www.ncac.gov.cn'),
('IN', 'India', true, '1928-04-01', true, true, false, 60, 'life_plus', 'moderate', 'https://copyright.gov.in'),
('BR', 'Brazil', true, '1922-02-09', true, true, false, 70, 'life_plus', 'moderate', 'https://www.gov.br/inpi'),
('MX', 'Mexico', true, '1967-06-11', true, true, false, 100, 'life_plus', 'moderate', 'https://www.indautor.gob.mx'),
('KR', 'South Korea', true, '1996-08-21', true, true, false, 70, 'life_plus', 'strong', 'https://www.copyright.or.kr'),
('IT', 'Italy', true, '1887-12-05', true, true, false, 70, 'life_plus', 'strong', 'https://www.siae.it'),
('ES', 'Spain', true, '1887-12-05', true, true, false, 70, 'life_plus', 'strong', 'https://www.mecd.gob.es'),
('NL', 'Netherlands', true, '1912-11-01', true, true, false, 70, 'life_plus', 'strong', 'https://www.rvo.nl'),
('SE', 'Sweden', true, '1904-08-01', true, true, false, 70, 'life_plus', 'strong', 'https://www.prv.se'),
('NO', 'Norway', true, '1896-04-13', true, true, false, 70, 'life_plus', 'strong', 'https://www.patentstyret.no'),
('DK', 'Denmark', true, '1903-07-01', true, true, false, 70, 'life_plus', 'strong', 'https://www.dkpto.dk'),
('FI', 'Finland', true, '1928-04-01', true, true, false, 70, 'life_plus', 'strong', 'https://www.prh.fi'),
('SG', 'Singapore', true, '1998-12-21', true, true, false, 70, 'life_plus', 'very_strong', 'https://www.ipos.gov.sg'),
('NZ', 'New Zealand', true, '1928-04-24', true, true, false, 50, 'life_plus', 'strong', 'https://www.iponz.govt.nz'),
('ZA', 'South Africa', true, '1928-10-03', true, true, false, 50, 'life_plus', 'moderate', 'https://www.cipc.co.za'),
('RU', 'Russia', true, '1995-03-13', true, true, false, 70, 'life_plus', 'moderate', 'https://rospatent.gov.ru'),
('PL', 'Poland', true, '1920-01-28', true, true, false, 70, 'life_plus', 'moderate', 'https://www.uprp.gov.pl'),
('CH', 'Switzerland', true, '1887-12-05', true, true, false, 70, 'life_plus', 'strong', 'https://www.ige.ch'),
('AT', 'Austria', true, '1920-10-01', true, true, false, 70, 'life_plus', 'strong', 'https://www.patentamt.at'),
('BE', 'Belgium', true, '1887-12-05', true, true, false, 70, 'life_plus', 'strong', 'https://economie.fgov.be'),
('IE', 'Ireland', true, '1927-10-05', true, true, false, 70, 'life_plus', 'strong', 'https://www.ipoi.gov.ie'),
('PT', 'Portugal', true, '1911-03-29', true, true, false, 70, 'life_plus', 'moderate', 'https://inpi.justica.gov.pt'),
('GR', 'Greece', true, '1920-11-09', true, true, false, 70, 'life_plus', 'moderate', 'https://www.opi.gr'),
('IL', 'Israel', true, '1950-03-24', true, true, false, 70, 'life_plus', 'strong', 'https://www.justice.gov.il'),
('AE', 'United Arab Emirates', true, '2004-07-14', true, true, false, 50, 'life_plus', 'moderate', 'https://www.economy.gov.ae'),
('SA', 'Saudi Arabia', true, '2004-03-11', true, true, false, 50, 'life_plus', 'moderate', 'https://www.saip.gov.sa'),
('TH', 'Thailand', true, '1931-07-17', true, true, false, 50, 'life_plus', 'weak', 'https://www.ipthailand.go.th'),
('MY', 'Malaysia', true, '1990-10-01', true, true, false, 50, 'life_plus', 'moderate', 'https://www.myipo.gov.my'),
('PH', 'Philippines', true, '1951-08-01', true, true, false, 50, 'life_plus', 'weak', 'https://www.ipophil.gov.ph'),
('ID', 'Indonesia', true, '1997-09-05', true, true, false, 70, 'life_plus', 'weak', 'https://dgip.go.id'),
('VN', 'Vietnam', true, '2004-10-26', true, true, false, 50, 'life_plus', 'weak', 'https://www.noip.gov.vn'),
('AR', 'Argentina', true, '1967-06-10', true, true, false, 70, 'life_plus', 'moderate', 'https://www.argentina.gob.ar/justicia/derechodeautor'),
('CL', 'Chile', true, '1970-06-05', true, true, false, 70, 'life_plus', 'moderate', 'https://www.inapi.cl')
ON CONFLICT (country_code) DO UPDATE SET
  country_name = EXCLUDED.country_name,
  berne_member = EXCLUDED.berne_member,
  berne_join_date = EXCLUDED.berne_join_date,
  wipo_wct_member = EXCLUDED.wipo_wct_member,
  trips_member = EXCLUDED.trips_member,
  registration_required = EXCLUDED.registration_required,
  term_of_protection_years = EXCLUDED.term_of_protection_years,
  term_basis = EXCLUDED.term_basis,
  enforcement_strength = EXCLUDED.enforcement_strength,
  copyright_office_url = EXCLUDED.copyright_office_url;

-- Seed AI Tool Registry
INSERT INTO ai_tool_registry (tool_name, provider, tool_type, description, copyright_considerations, output_ownership) VALUES
('GPT-4', 'OpenAI', 'text_generation', 'Large language model for text generation', 'AI-generated content may not be copyrightable without significant human creative input', 'User owns outputs per terms of service'),
('Claude', 'Anthropic', 'text_generation', 'AI assistant for text generation and analysis', 'Outputs are not owned by Anthropic; user responsibility for copyright', 'User owns outputs'),
('Gemini', 'Google', 'multi_modal', 'Multimodal AI for text and image understanding', 'Generated content subject to standard AI copyright considerations', 'User owns outputs per terms'),
('DALL-E', 'OpenAI', 'image_generation', 'AI image generation from text prompts', 'Generated images may have limited copyright protection', 'User owns generated images'),
('Midjourney', 'Midjourney Inc', 'image_generation', 'AI art generation platform', 'Commercial use rights depend on subscription tier', 'Varies by subscription tier'),
('Stable Diffusion', 'Stability AI', 'image_generation', 'Open-source image generation model', 'Open-source model; output rights vary by implementation', 'User owns outputs'),
('ElevenLabs', 'ElevenLabs', 'audio_generation', 'AI voice synthesis and cloning', 'Voice cloning requires rights to original voice', 'User owns generated audio'),
('Suno', 'Suno AI', 'audio_generation', 'AI music generation', 'Generated music has commercial restrictions', 'Limited commercial rights'),
('Runway', 'Runway ML', 'video_generation', 'AI video generation and editing', 'Generated video subject to AI copyright limitations', 'User owns outputs per terms'),
('GitHub Copilot', 'GitHub/Microsoft', 'code_generation', 'AI code completion and generation', 'Code suggestions may match existing copyrighted code', 'User responsible for code review')
ON CONFLICT (tool_name, provider) DO NOTHING;
