/*
  # Seed Spelling Bee Winners Data

  This migration populates the spelling_bee_winners table with historical
  winning words from the Scripps National Spelling Bee from 1925 to 2024.

  Data includes:
  - Year and winning word
  - Winner names (where available)
  - Dictionary definitions
  - Parts of speech and language origins
  - Difficulty classifications
*/

INSERT INTO spelling_bee_winners (year, winning_word, winner_name, definition, part_of_speech, language_origin, pronunciation, example_sentence, difficulty_level)
VALUES
-- 2020s
(2024, 'abseil', 'Bruhat Soma', 'To descend a steep or vertical surface by using a doubled rope coiled around the body and attached at a higher point', 'verb', 'German', 'AB-zyl', 'The climbers had to abseil down the cliff face to reach the valley below.', 'hard'),
(2023, 'psammophile', 'Dev Shah', 'An organism that thrives in sandy areas or sandy soil', 'noun', 'Greek', 'SAM-oh-fyl', 'The desert lizard is a true psammophile, perfectly adapted to life in the dunes.', 'expert'),
(2022, 'moorhen', 'Harini Logan', 'A small dark waterbird with a red and yellow bill', 'noun', 'English', 'MOOR-hen', 'We spotted a moorhen swimming among the reeds at the pond.', 'medium'),
(2021, 'murraya', 'Zaila Avant-garde', 'A genus of tropical Asiatic and Australian trees and shrubs of the rue family', 'noun', 'Latin', 'muh-RAY-uh', 'The murraya in our garden produces fragrant white flowers.', 'hard'),
(2019, 'auslaut', 'Rishik Gandhasri', 'The final sound or sounds of a word or syllable', 'noun', 'German', 'OWS-lowt', 'In linguistics, the auslaut of the word "cat" is the "t" sound.', 'expert'),
(2019, 'erysipelas', 'Saketh Sundar', 'An acute disease of the skin caused by a streptococcus and marked by spreading inflammation', 'noun', 'Greek', 'er-uh-SIP-uh-luhs', 'The patient was diagnosed with erysipelas and prescribed antibiotics.', 'expert'),
(2019, 'bougainvillea', 'Shruthika Padhy', 'A tropical woody climbing plant with ornamental red or purple bracts', 'noun', 'French', 'boo-guhn-VIL-ee-uh', 'The bougainvillea cascading over the wall added brilliant color to the garden.', 'hard'),
(2019, 'aiguillette', 'Sohum Sukhatankar', 'An ornamental tagged cord or braid worn on the shoulder especially by military personnel', 'noun', 'French', 'ay-gwi-LET', 'The general wore a golden aiguillette on his dress uniform.', 'expert'),
(2019, 'pendeloque', 'Abhijay Kodali', 'A pear-shaped glass pendant used as an ornament in a chandelier', 'noun', 'French', 'pahn-duh-LOHK', 'The antique chandelier was adorned with crystal pendeloques.', 'expert'),
(2019, 'palama', 'Christopher Serrao', 'The webbing on the feet of aquatic birds', 'noun', 'Latin', 'puh-LAY-muh', 'The duck palama helps it swim efficiently through the water.', 'expert'),
(2019, 'cernuous', 'Erin Howard', 'Having the apex bent downward; nodding or drooping', 'adjective', 'Latin', 'SUR-nyoo-uhs', 'The cernuous flowers of the snowdrop hang elegantly toward the ground.', 'expert'),
(2019, 'odylic', 'Rohan Raja', 'Of or relating to od, a hypothetical force once thought to pervade nature', 'adjective', 'German', 'oh-DIL-ik', 'The 19th century scientist believed in odylic forces influencing nature.', 'expert'),
(2018, 'koinonia', 'Karthik Nemmani', 'Intimate spiritual communion and participative sharing in a religious community', 'noun', 'Greek', 'koy-noh-NEE-uh', 'The congregation emphasized koinonia through their weekly fellowship meals.', 'expert'),
(2017, 'marocain', 'Ananya Vinay', 'A dress fabric with a crinkled surface made of silk, wool, or rayon', 'noun', 'French', 'mar-oh-KAYN', 'Her elegant gown was made of luxurious marocain fabric.', 'hard'),
(2016, 'gesellschaft', 'Jairam Hathwar', 'A type of society characterized by impersonal relationships', 'noun', 'German', 'guh-ZEL-shahft', 'Modern urban life often exemplifies gesellschaft social structures.', 'expert'),
(2016, 'feldenkrais', 'Nihar Janga', 'A system of body movements intended to increase body awareness', 'noun', 'German', 'FEL-den-krys', 'She practices feldenkrais to improve her posture and flexibility.', 'expert'),
(2015, 'scherenschnitte', 'Vanya Shivashankar', 'The art of cutting paper into decorative designs', 'noun', 'German', 'SHER-en-shnit-uh', 'The artist created intricate scherenschnitte for the holiday decorations.', 'expert'),
(2015, 'nunatak', 'Gokul Venkatachalam', 'An isolated mountain peak projecting through glacial ice', 'noun', 'Inuit', 'NOO-nuh-tak', 'The expedition team could see the nunatak rising above the ice sheet.', 'hard'),
(2014, 'stichomythia', 'Ansun Sujoe', 'Dialogue especially of altercation delivered in alternating lines', 'noun', 'Greek', 'stik-oh-MITH-ee-uh', 'The playwright used stichomythia to create tension in the argument scene.', 'expert'),
(2014, 'feuilleton', 'Sriram Hathwar', 'A part of a European newspaper devoted to light literature or criticism', 'noun', 'French', 'FOY-uh-tahn', 'The writer contributed a weekly feuilleton to the Paris newspaper.', 'expert'),
(2013, 'knaidel', 'Arvind Mahankali', 'A small ball of leavened dough usually served in soup', 'noun', 'Yiddish', 'KNAYD-ul', 'Grandmother always made the best knaidel for the holiday soup.', 'hard'),
(2012, 'guetapens', 'Snigdha Nandipati', 'An ambush or trap', 'noun', 'French', 'get-ah-PAHN', 'The soldiers narrowly escaped the guetapens set by the enemy.', 'expert'),
(2011, 'cymotrichous', 'Sukanya Roy', 'Having wavy hair', 'adjective', 'Greek', 'sy-MAH-tri-kuhs', 'The geneticist studied cymotrichous hair patterns in different populations.', 'expert'),
(2010, 'stromuhr', 'Anamika Veeramani', 'An instrument for measuring the amount of blood flowing through an artery', 'noun', 'German', 'STROHM-oor', 'The surgeon used a stromuhr to monitor blood flow during the procedure.', 'expert'),

-- 2000s
(2009, 'laodicean', 'Kavya Shivashankar', 'Lukewarm or indifferent in religion or politics', 'adjective', 'Greek', 'lay-od-ih-SEE-uhn', 'His laodicean attitude toward voting frustrated his politically active friends.', 'expert'),
(2008, 'guerdon', 'Sameer Mishra', 'A reward or recompense', 'noun', 'Old French', 'GUR-duhn', 'The knight received a rich guerdon for his brave deeds.', 'hard'),
(2007, 'serrefine', 'Evan OʼDorney', 'A small forceps for clamping a blood vessel', 'noun', 'French', 'SAIR-uh-feen', 'The surgeon requested a serrefine to control the bleeding.', 'expert'),
(2006, 'ursprache', 'Katharine Close', 'A parent language especially one reconstructed from evidence', 'noun', 'German', 'OOR-shprah-khuh', 'Linguists have reconstructed Proto-Indo-European as an ursprache.', 'expert'),
(2005, 'appoggiatura', 'Anurag Kashyap', 'An embellishing note or tone preceding an essential melodic note', 'noun', 'Italian', 'uh-poj-uh-TOOR-uh', 'The pianist added a delicate appoggiatura before the main theme.', 'expert'),
(2004, 'autochthonous', 'David Tidmarsh', 'Indigenous rather than introduced; formed in the place where found', 'adjective', 'Greek', 'aw-TOK-thuh-nuhs', 'The museum displayed autochthonous artifacts from the region.', 'expert'),
(2003, 'pococurante', 'Sai Gunturi', 'Indifferent or apathetic; a careless or indifferent person', 'noun/adjective', 'Italian', 'poh-koh-kyoo-RAN-tee', 'His pococurante attitude toward his studies worried his parents.', 'expert'),
(2002, 'prospicience', 'Pratyush Buddiga', 'The act of looking forward; foresight', 'noun', 'Latin', 'proh-SPISH-ee-uhns', 'With remarkable prospicience, she predicted the market changes.', 'expert'),
(2001, 'succedaneum', 'Sean Conley', 'A substitute or replacement', 'noun', 'Latin', 'suk-si-DAY-nee-uhm', 'Coffee served as a succedaneum when tea was unavailable.', 'expert'),
(2000, 'demarche', 'George Thampy', 'A course of action; a diplomatic representation or protest', 'noun', 'French', 'day-MARSH', 'The ambassador issued a formal demarche to the foreign government.', 'hard'),

-- 1990s
(1999, 'logorrhea', 'Nupur Lala', 'Excessive and often incoherent talkativeness', 'noun', 'Greek', 'law-guh-REE-uh', 'The professor was known for his logorrhea during lectures.', 'hard'),
(1998, 'chiaroscurist', 'Jody-Anne Maxwell', 'An artist who specializes in chiaroscuro', 'noun', 'Italian', 'kee-ar-uh-SKYOOR-ist', 'Rembrandt was a master chiaroscurist in his paintings.', 'expert'),
(1997, 'euonym', 'Rebecca Sealfon', 'A name well suited to the person, place, or thing named', 'noun', 'Greek', 'YOO-uh-nim', 'Baker as a surname for a family of bakers is a perfect euonym.', 'hard'),
(1996, 'vivisepulture', 'Wendy Guey', 'The act of burying alive', 'noun', 'Latin', 'viv-uh-suh-PUL-chur', 'Tales of vivisepulture have appeared in horror literature throughout history.', 'expert'),
(1995, 'xanthosis', 'Justin Carroll', 'Yellowish discoloration of the skin', 'noun', 'Greek', 'zan-THOH-sis', 'The doctor diagnosed the patients yellowing skin as xanthosis.', 'hard'),
(1994, 'antediluvian', 'Ned Andrews', 'Of or relating to the period before the biblical flood; very old or old-fashioned', 'adjective', 'Latin', 'an-tee-duh-LOO-vee-uhn', 'The antediluvian computer system desperately needed an upgrade.', 'hard'),
(1993, 'kamikaze', 'Geoff Hooper', 'A Japanese aircraft loaded with explosives for a suicide crash; recklessly self-destructive', 'noun/adjective', 'Japanese', 'kah-mih-KAH-zee', 'His kamikaze driving style made everyone nervous.', 'medium'),
(1992, 'lyceum', 'Amanda Goad', 'A hall for public lectures or discussions; an institution for education', 'noun', 'Greek', 'ly-SEE-uhm', 'The town lyceum hosted weekly debates on current events.', 'medium'),
(1991, 'antipyretic', 'Joanne Lagatta', 'An agent that reduces fever', 'noun/adjective', 'Greek', 'an-tee-py-RET-ik', 'The doctor prescribed an antipyretic to bring down her fever.', 'hard'),
(1990, 'fibranne', 'Amy Marie Dimak', 'A fabric made of spun-rayon yarn', 'noun', 'French', 'fih-BRAN', 'The summer dress was made of lightweight fibranne.', 'hard'),

-- 1980s
(1989, 'spoliator', 'Scott Isaacs', 'One who plunders or despoils', 'noun', 'Latin', 'SPOH-lee-ay-tur', 'The spoliator stripped the ancient tomb of its treasures.', 'hard'),
(1988, 'elegiacal', 'Rageshree Ramachandran', 'Relating to or involving elegy or mourning', 'adjective', 'Greek', 'el-uh-JY-uh-kuhl', 'The poets elegiacal verses moved the audience to tears.', 'hard'),
(1987, 'staphylococci', 'Stephanie Petit', 'Spherical bacteria that occur in grapelike clusters', 'noun', 'Greek', 'staf-uh-loh-KOK-sy', 'The lab results showed the presence of staphylococci in the sample.', 'hard'),
(1986, 'odontalgia', 'Jon Pennington', 'Pain in a tooth; toothache', 'noun', 'Greek', 'oh-don-TAL-juh', 'The patient complained of severe odontalgia in his lower molar.', 'hard'),
(1985, 'milieu', 'Balu Natarajan', 'The physical or social setting in which something occurs', 'noun', 'French', 'meel-YOO', 'The artists creative milieu inspired his best work.', 'medium'),
(1984, 'luge', 'Daniel Greenblatt', 'A small sled for one or two people ridden in a supine position', 'noun', 'French', 'loozh', 'The athlete practiced on the luge track before the competition.', 'easy'),
(1983, 'purim', 'Blake Giddens', 'A Jewish festival commemorating the deliverance of the Jews from Haman', 'noun', 'Hebrew', 'POOR-im', 'The community celebrated Purim with costumes and feasting.', 'medium'),
(1982, 'psoriasis', 'Molly Dieveney', 'A chronic skin disease characterized by dry red patches covered with scales', 'noun', 'Greek', 'suh-RY-uh-sis', 'The dermatologist prescribed a new treatment for her psoriasis.', 'hard'),
(1981, 'sarcophagus', 'Paige Pipkin', 'A stone coffin, often decorated with sculpture or inscriptions', 'noun', 'Greek', 'sar-KOF-uh-guhs', 'The archaeologists discovered an ancient sarcophagus in the tomb.', 'medium'),
(1980, 'elucubrate', 'Jacques Bailly', 'To work out or express by studious effort', 'verb', 'Latin', 'ih-LOO-kyoo-brayt', 'The scholar would elucubrate his theories late into the night.', 'expert'),

-- 1970s
(1979, 'maculature', 'Katie Kerwin', 'Spotted or blotched condition; waste paper or sheets spoiled in printing', 'noun', 'Latin', 'MAK-yoo-luh-chur', 'The printer set aside the maculature for recycling.', 'hard'),
(1978, 'deification', 'Peg McCarthy', 'The act of making into a god; exaltation to divine status', 'noun', 'Latin', 'dee-ih-fih-KAY-shun', 'The deification of the emperor was common in ancient Rome.', 'hard'),
(1977, 'cambist', 'John Paola', 'A person skilled in foreign exchange; a manual of exchange rates', 'noun', 'Italian', 'KAM-bist', 'The cambist calculated the currency conversion for the merchant.', 'hard'),
(1976, 'narcolepsy', 'Tim Kneale', 'A condition characterized by brief attacks of deep sleep', 'noun', 'Greek', 'NAR-kuh-lep-see', 'The doctor diagnosed the patient with narcolepsy after sleep studies.', 'hard'),
(1975, 'incisor', 'Hugh Tosteson', 'A front tooth adapted for cutting', 'noun', 'Latin', 'in-SY-zur', 'The dentist examined the chipped incisor carefully.', 'medium'),
(1974, 'hydrophyte', 'Julie Ann Junkin', 'A plant that grows in water or very wet soil', 'noun', 'Greek', 'HY-druh-fyt', 'Water lilies are classic examples of hydrophytes.', 'hard'),
(1973, 'vouchsafe', 'Barrie Trinkle', 'To grant or give as a special favor or privilege', 'verb', 'English', 'vowch-SAYF', 'The king would vouchsafe an audience to the petitioner.', 'medium'),
(1972, 'macerate', 'Robin Kral', 'To cause to waste away; to soften by soaking', 'verb', 'Latin', 'MAS-uh-rayt', 'The recipe required you to macerate the berries in sugar overnight.', 'medium'),
(1971, 'shalloon', 'Jonathan Knisely', 'A lightweight twilled fabric used chiefly for linings', 'noun', 'French', 'sha-LOON', 'The tailor used shalloon to line the jacket.', 'hard'),
(1970, 'croissant', 'Libby Childress', 'A rich crescent-shaped roll', 'noun', 'French', 'kruh-SAHNT', 'She enjoyed a warm croissant with her morning coffee.', 'easy'),

-- 1960s
(1969, 'interlocutory', 'Susan Yoachim', 'Of or relating to dialogue; pronounced during legal proceedings', 'adjective', 'Latin', 'in-tur-LOK-yuh-tor-ee', 'The judge issued an interlocutory order while the case continued.', 'hard'),
(1968, 'abalone', 'Robert Wake', 'An edible mollusk with an ear-shaped shell lined with mother-of-pearl', 'noun', 'Spanish', 'ab-uh-LOH-nee', 'The diver collected abalone from the rocky shore.', 'medium'),
(1967, 'chihuahua', 'Jennifer Reinke', 'A very small round-headed dog of Mexican origin', 'noun', 'Spanish', 'chih-WAH-wuh', 'Her tiny chihuahua fit perfectly in her handbag.', 'medium'),
(1966, 'ratoon', 'Robert Walters', 'A shoot from the root of a plant, especially sugarcane', 'noun', 'Spanish', 'ra-TOON', 'The farmer harvested the ratoon crop from last years sugarcane.', 'hard'),
(1965, 'eczema', 'Michael Kerpan', 'An inflammatory skin condition causing itching and redness', 'noun', 'Greek', 'EK-suh-muh', 'The cream helped soothe her eczema symptoms.', 'medium'),
(1964, 'sycophant', 'William Kerek', 'A servile self-seeking flatterer', 'noun', 'Greek', 'SIK-uh-fuhnt', 'The boss was surrounded by sycophants who agreed with everything he said.', 'medium'),
(1963, 'equipage', 'Glen Van Slyke', 'A carriage with horses and servants; equipment', 'noun', 'French', 'EK-wuh-pij', 'The wealthy family arrived in an elegant equipage.', 'hard'),
(1962, 'esquamulose', 'Nettie Crawford', 'Not covered with scales; having no scales', 'adjective', 'Latin', 'es-KWAM-yoo-lohs', 'The biologist noted that the specimen was esquamulose.', 'expert'),
(1961, 'smaragdine', 'John Capehart', 'Of or relating to emeralds; having the color of emeralds', 'adjective', 'Greek', 'smuh-RAG-din', 'Her eyes were a striking smaragdine green.', 'hard'),
(1960, 'troche', 'Henry Feldman', 'A small medicinal lozenge', 'noun', 'Greek', 'TROH-kee', 'The pharmacist recommended a throat troche for her cough.', 'medium'),

-- 1950s
(1959, 'catamaran', 'Joel Montgomery', 'A boat with twin hulls in parallel', 'noun', 'Tamil', 'kat-uh-muh-RAN', 'They sailed the catamaran across the bay.', 'medium'),
(1958, 'syllepsis', 'Jolitta Schlehuber', 'A grammatical construction where one word relates to two others differently', 'noun', 'Greek', 'sih-LEP-sis', 'The sentence used syllepsis for humorous effect.', 'expert'),
(1957, 'schappe', 'Sandra Owen', 'A fabric or yarn made from waste silk', 'noun', 'German', 'SHAP-uh', 'The blend included schappe for added texture.', 'hard'),
(1956, 'condominium', 'Melody Sachko', 'Joint sovereignty; an individually owned unit in a multi-unit building', 'noun', 'Latin', 'kon-duh-MIN-ee-uhm', 'They purchased a condominium overlooking the beach.', 'medium'),
(1955, 'crustaceology', 'Sandra Sloss', 'The scientific study of crustaceans', 'noun', 'Latin', 'kruhs-tay-see-OL-uh-jee', 'Her interest in lobsters led her to study crustaceology.', 'hard'),
(1954, 'transept', 'William Cashore', 'The part of a cruciform church crossing the nave at right angles', 'noun', 'Latin', 'TRAN-sept', 'The stained glass windows in the transept were magnificent.', 'hard'),
(1953, 'soubrette', 'Elizabeth Hess', 'A coquettish maidservant in comedies; an actress playing such a role', 'noun', 'French', 'soo-BRET', 'She was cast as the clever soubrette in the play.', 'hard'),
(1952, 'vignette', 'Doris Ann Hall', 'A brief evocative description or scene; a small illustration', 'noun', 'French', 'vin-YET', 'The author opened the chapter with a charming vignette.', 'medium'),
(1951, 'insouciant', 'Irving Belz', 'Showing a casual lack of concern; carefree', 'adjective', 'French', 'in-SOO-see-uhnt', 'His insouciant attitude masked his deep anxiety.', 'hard'),
(1950, 'meticulosity', 'Colquitt Dean', 'The quality of being extremely careful about details', 'noun', 'Latin', 'muh-tik-yoo-LOS-ih-tee', 'Her meticulosity ensured the project was error-free.', 'hard'),

-- 1940s
(1949, 'dulcimer', 'Kim Calvin', 'A stringed musical instrument played by striking with small hammers', 'noun', 'Latin', 'DUHL-sih-mur', 'The folk musician played a beautiful melody on the dulcimer.', 'medium'),
(1948, 'psychiatry', 'Jean Chappelear', 'The branch of medicine dealing with mental disorders', 'noun', 'Greek', 'sy-KY-uh-tree', 'She decided to specialize in psychiatry after medical school.', 'medium'),
(1947, 'chlorophyll', 'Marian Richardson', 'The green pigment in plants essential for photosynthesis', 'noun', 'Greek', 'KLOR-uh-fil', 'Chlorophyll gives leaves their characteristic green color.', 'medium'),
(1946, 'semaphore', 'George Odom', 'A system of signaling using flags or lights', 'noun', 'Greek', 'SEM-uh-for', 'The sailors communicated using semaphore flags.', 'medium'),
(1943, 'torsion', 'No winner recorded', 'The act of twisting or turning; the state of being twisted', 'noun', 'Latin', 'TOR-shun', 'The engineer calculated the torsion on the metal beam.', 'medium'),
(1942, 'sacrilegious', 'Richard Earnhardt', 'Involving violation of something sacred', 'adjective', 'Latin', 'sak-ruh-LIJ-uhs', 'Removing artifacts from the temple was considered sacrilegious.', 'hard'),
(1941, 'initials', 'Louis Kuslan', 'The first letters of a persons name', 'noun', 'Latin', 'ih-NISH-uhlz', 'She embroidered her initials on the handkerchief.', 'easy'),
(1940, 'therapy', 'Laurel Kuykendall', 'Treatment of disease or disorder', 'noun', 'Greek', 'THER-uh-pee', 'Physical therapy helped him recover from the injury.', 'easy'),

-- 1930s
(1939, 'canonical', 'Elizabeth Rice', 'Conforming to established rules or standards; relating to canon law', 'adjective', 'Greek', 'kuh-NON-ih-kuhl', 'The canonical hours structure the daily prayers in monasteries.', 'hard'),
(1938, 'sanitarium', 'Marion Richardson', 'An establishment for treating chronic diseases or recovering health', 'noun', 'Latin', 'san-ih-TAIR-ee-uhm', 'The tuberculosis patient recovered at the mountain sanitarium.', 'medium'),
(1937, 'promiscuous', 'Waneeta Beckley', 'Having numerous casual relationships; indiscriminate', 'adjective', 'Latin', 'pruh-MIS-kyoo-uhs', 'The promiscuous mixing of chemicals can be dangerous.', 'hard'),
(1936, 'interning', 'Jean Trowbridge', 'Working as an intern; confining as a prisoner', 'verb', 'French', 'in-TURN-ing', 'She was interning at the hospital during medical school.', 'medium'),
(1935, 'intelligible', 'Clara Mohler', 'Capable of being understood', 'adjective', 'Latin', 'in-TEL-ih-juh-buhl', 'His handwriting was barely intelligible.', 'medium'),
(1934, 'deteriorating', 'Sarah Wilson', 'Becoming progressively worse', 'adjective', 'Latin', 'dih-TEER-ee-uh-ray-ting', 'The deteriorating conditions forced evacuation.', 'medium'),
(1933, 'propitiatory', 'Alma Roach', 'Intended to appease or conciliate', 'adjective', 'Latin', 'pruh-PISH-ee-uh-tor-ee', 'The propitiatory offering was meant to calm the angry spirits.', 'hard'),
(1932, 'knack', 'Dorothy Greenwald', 'A clever trick; a special skill or talent', 'noun', 'Germanic', 'nak', 'She had a knack for solving puzzles quickly.', 'easy'),
(1931, 'foulard', 'Ward Randall', 'A lightweight plain-woven or twilled silk usually decorated with a printed pattern', 'noun', 'French', 'foo-LARD', 'The gentleman wore a foulard tie to the event.', 'hard'),
(1930, 'fracas', 'Helen Jensen', 'A noisy quarrel or brawl', 'noun', 'French', 'FRAY-kuhs', 'The fracas in the tavern resulted in several arrests.', 'medium'),

-- 1920s
(1929, 'asceticism', 'Virginia Hogan', 'The practice of severe self-discipline and abstention', 'noun', 'Greek', 'uh-SET-ih-siz-uhm', 'The monks life of asceticism included fasting and silence.', 'hard'),
(1928, 'albumen', 'Betty Robinson', 'The white of an egg; a protein found in blood plasma and eggs', 'noun', 'Latin', 'al-BYOO-muhn', 'The recipe called for separated albumen for the meringue.', 'medium'),
(1927, 'luxuriance', 'Dean Lucas', 'Abundant or lavish growth; richness', 'noun', 'Latin', 'luhg-ZHOOR-ee-uhns', 'The luxuriance of the tropical garden was breathtaking.', 'hard'),
(1926, 'abrogate', 'Pauline Bell', 'To abolish or annul by authority', 'verb', 'Latin', 'AB-ruh-gayt', 'The new government moved to abrogate the unfair treaty.', 'hard'),
(1925, 'gladiolus', 'Frank Neuhauser', 'A plant of the iris family with sword-shaped leaves and spikes of flowers', 'noun', 'Latin', 'glad-ee-OH-luhs', 'She planted gladiolus bulbs along the garden fence.', 'medium')

ON CONFLICT (year, winning_word) DO UPDATE SET
  winner_name = EXCLUDED.winner_name,
  definition = EXCLUDED.definition,
  part_of_speech = EXCLUDED.part_of_speech,
  language_origin = EXCLUDED.language_origin,
  pronunciation = EXCLUDED.pronunciation,
  example_sentence = EXCLUDED.example_sentence,
  difficulty_level = EXCLUDED.difficulty_level,
  updated_at = now();