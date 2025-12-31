import { useState, useRef } from 'react';
import { ChevronDown, ChevronUp, Download, Printer, Search, ArrowUp, BookOpen } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  icon: string;
  content: string[];
  subsections?: { title: string; content: string }[];
}

const sections: Section[] = [
  {
    id: 'welcome',
    title: 'Welcome & Overview',
    icon: '👋',
    content: [
      'Welcome to the AI Animation Studio, your comprehensive platform for creating animated content powered by artificial intelligence. This guide will walk you through every step of the production process, from initial concept to final delivery.'
    ]
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: '🚀',
    content: [
      'When you first enter the platform, you\'ll see the Dashboard. This is your command center where you can:',
      '• View all your active shows and their progress',
      '• Access key metrics about your production',
      '• Quickly navigate to different modules',
      '• Monitor system health and API status',
      'Take a moment to familiarize yourself with the layout. The left sidebar contains your main navigation menu, and the top right shows workspace and organization options.'
    ]
  },
  {
    id: 'show-concept',
    title: 'Understanding Show Concept',
    icon: '📺',
    content: [
      'A "Show" (or Series) is your animated production. It contains:',
      '• Title and description of your animation project',
      '• Format configuration (episode length, aspect ratio, style)',
      '• All characters specific to this show',
      '• All scripts and episodes for this show',
      '• Production settings and cost configurations',
      'You can create multiple shows within one workspace. Each show operates independently with its own characters, scripts, and assets.'
    ]
  },
  {
    id: 'character-creation',
    title: 'Creating Characters',
    icon: '👤',
    content: [
      'Characters are the heart of your animation. To create a character:',
      '1. Navigate to the Characters section from the main menu',
      '2. Click "New Character"',
      '3. Enter character details:',
      '   - Name: The character\'s name',
      '   - Description: Physical appearance, personality traits',
      '   - Voice Profile: Select from available AI voices',
      '   - Reference Images: Upload images showing the character\'s design',
      '4. Save and the character is ready to use',
      'Pro tip: Upload 3-5 reference images from different angles for consistency in generated animations.'
    ]
  },
  {
    id: 'script-creation',
    title: 'Creating Scripts',
    icon: '📝',
    content: [
      'Scripts define what happens in your animation. You have two options:',
      '',
      'Option 1: Upload Existing Script',
      '• Navigate to Scripts section',
      '• Click "Upload Script"',
      '• Provide a .docx or .txt file with dialogue and action descriptions',
      '• The system will analyze and extract character dialogue',
      '',
      'Option 2: Use AI Studio to Generate',
      '• Go to AI Studio',
      '• Describe your story concept',
      '• Specify length and characters',
      '• AI generates a complete script',
      '',
      'Once created, your script will have:',
      '• Automatically extracted character lines',
      '• Scene descriptions',
      '• Duration estimation',
      '• Format configuration (11-minute, 7-minute, shorts, etc.)'
    ]
  },
  {
    id: 'episode-creation',
    title: 'Creating Episodes',
    icon: '🎬',
    content: [
      'Episodes tie scripts to production settings. To create an episode:',
      '1. Go to Episodes section',
      '2. Click "New Episode"',
      '3. Select or create a script',
      '4. Configure episode settings:',
      '   - Episode number and title',
      '   - Release date',
      '   - Production format',
      '   - Cost configuration',
      '5. Save',
      '',
      'Each episode tracks its own progress through the production pipeline, from script to final delivery. You can see what stage each scene is in and estimate completion dates.'
    ]
  },
  {
    id: 'storyboard-generation',
    title: 'Generating Storyboards',
    icon: '🖼️',
    content: [
      'Storyboards are visual plans for your animation. To generate storyboards:',
      '1. Select an episode',
      '2. Click "Generate Storyboards"',
      '3. The system will:',
      '   - Break down your script into individual shots',
      '   - Generate visual descriptions',
      '   - Create reference images using AI',
      '4. Review and edit storyboard images if needed',
      '5. Approve to move forward',
      '',
      'You can also:',
      '• Upload your own reference images for specific shots',
      '• Edit shot descriptions to better match your vision',
      '• Adjust timing and framing',
      '• Compare multiple AI-generated options per shot'
    ]
  },
  {
    id: 'shot-list',
    title: 'Creating Shot Lists',
    icon: '🎥',
    content: [
      'A shot list breaks your storyboard down into individual clips. Each shot is:',
      '• A unique camera angle or perspective',
      '• Associated with specific character dialogue',
      '• Tied to visual descriptions and reference images',
      '• Tracked separately through production',
      '',
      'To create a shot list:',
      '1. Start from an approved storyboard',
      '2. Click "Generate Shot List"',
      '3. The system creates individual shots from each storyboard panel',
      '4. Review and adjust shot definitions',
      '5. Each shot is now ready for animation generation'
    ]
  },
  {
    id: 'video-generation',
    title: 'Generating Videos',
    icon: '🎞️',
    content: [
      'This is where your animation comes to life. To generate video:',
      '1. From the Production section, select shots to animate',
      '2. Choose animation settings:',
      '   - Animation style (hand-drawn, 3D, watercolor, etc.)',
      '   - Quality level',
      '   - Resolution',
      '3. Click "Generate Videos"',
      '4. The AI will:',
      '   - Create animations matching your visual references',
      '   - Sync timing to dialogue',
      '   - Generate multiple takes if desired',
      '5. Review generated videos and select the best version',
      '',
      'Note: Video generation uses Vertex AI or similar services and may take several minutes per shot.'
    ]
  },
  {
    id: 'voice-audio',
    title: 'Voice & Audio Production',
    icon: '🎤',
    content: [
      'Audio brings your characters to life. The platform supports multiple voice providers:',
      '',
      'Step 1: Configure Voice Settings',
      '• Go to Settings > Voice Configuration',
      '• Choose your voice provider (ElevenLabs, Chatterbox, etc.)',
      '• Enter API credentials if needed',
      '',
      'Step 2: Assign Voices to Characters',
      '• Each character is assigned a voice from your chosen provider',
      '• Test voices to ensure they match the character',
      '• Adjust voice parameters (speed, emotion, tone)',
      '',
      'Step 3: Generate Dialogue Audio',
      '• Select an episode with generated storyboards',
      '• Click "Generate Audio"',
      '• The system extracts all dialogue and generates voice files',
      '• Audio files are synced with generated videos',
      '',
      'Step 4: Lip-Sync Alignment',
      '• The platform can automatically sync lip movements to audio',
      '• Review and adjust if needed',
      '• Fine-tune timing for natural appearance'
    ]
  },
  {
    id: 'assembly',
    title: 'Assembling Final Episode',
    icon: '✂️',
    content: [
      'Assembly is where all elements come together. To assemble an episode:',
      '1. Ensure all shots have:',
      '   - Generated video',
      '   - Synchronized audio/dialogue',
      '   - Proper timing and transitions',
      '2. Go to Production > Assembly',
      '3. Review the sequence:',
      '   - Check timing flows naturally',
      '   - Verify audio syncs with video',
      '   - Look for any gaps or transitions',
      '4. Make adjustments as needed:',
      '   - Trim shots',
      '   - Adjust transitions',
      '   - Add background audio/music',
      '5. Export final episode:',
      '   - Choose resolution and format',
      '   - Select quality settings',
      '   - Download or upload to your platform'
    ]
  },
  {
    id: 'advanced-features',
    title: 'Advanced Features',
    icon: '⚡',
    content: [
      'The platform includes powerful advanced capabilities:',
      '',
      'Cost Tracking & Analytics:',
      '• Production Economics shows detailed cost breakdowns',
      '• Track spending by category (animation, voices, etc.)',
      '• Compare actual vs. budgeted costs',
      '• Estimate profitability by distribution channel',
      '',
      'IP Protection:',
      '• Register copyrights for your scripts and content',
      '• File patent applications for unique techniques',
      '• Manage trademark rights for character names',
      '• Track international copyright protections',
      '',
      'Translations:',
      '• Generate scripts in multiple languages',
      '• Create dubbed versions with localized voices',
      '• Maintain subtitle files',
      '• Track translation costs and status',
      '',
      'Character Consistency:',
      '• Reference management ensures character consistency',
      '• Track character appearance across episodes',
      '• Manage character aliases and variants',
      '• Quality checks for visual continuity'
    ]
  },
  {
    id: 'production-workflow',
    title: 'Complete Production Workflow',
    icon: '🔄',
    content: [
      'Here is the typical production workflow from start to finish:',
      '',
      '1. Create Show - Define your animation series',
      '2. Add Characters - Create all main and supporting characters',
      '3. Write Script - Create episode script',
      '4. Create Episode - Link script to episode with settings',
      '5. Generate Storyboards - Create visual plan from script',
      '6. Create Shot List - Break storyboard into individual shots',
      '7. Generate Videos - Create animations for each shot',
      '8. Configure Audio - Set up character voices',
      '9. Generate Dialogue - Create voice files from script',
      '10. Sync Audio-Video - Align voices with animations',
      '11. Assemble Episode - Combine all elements in sequence',
      '12. Quality Review - Check for issues and polish',
      '13. Export & Publish - Download and distribute',
      '14. Analyze Results - Track performance and costs',
      '',
      'You can work on multiple episodes simultaneously at different stages.'
    ]
  },
  {
    id: 'quick-reference',
    title: 'Quick Reference Guide',
    icon: '📋',
    content: [
      'Common Tasks:',
      '',
      'Upload a Script:',
      'Scripts > Upload > Select .docx or .txt file > Configure settings > Save',
      '',
      'Create a New Character:',
      'Characters > New Character > Fill details > Upload reference images > Save voice settings > Save',
      '',
      'Generate Storyboards:',
      'Episodes > Select episode > Generate Storyboards > Review > Approve',
      '',
      'Change Character Voice:',
      'Characters > Select character > Voice Settings > Choose new voice > Test > Save',
      '',
      'Export Episode:',
      'Production > Select episode > Review all shots > Export > Choose format > Download',
      '',
      'View Production Costs:',
      'Production Economics > Select episode > View breakdown by category'
    ]
  },
  {
    id: 'best-practices',
    title: 'Best Practices & Tips',
    icon: '💡',
    content: [
      'Character Design:',
      '• Upload reference images from multiple angles',
      '• Keep character designs distinctive and recognizable',
      '• Document character traits in the description field',
      '',
      'Script Quality:',
      '• Keep scripts focused and concise',
      '• Use clear action descriptions',
      '• Ensure dialogue is properly attributed to characters',
      '• Test AI-generated scripts before proceeding',
      '',
      'Video Generation:',
      '• Generate multiple takes and choose the best',
      '• Maintain consistent animation style throughout series',
      '• Use reference images that match your vision',
      '• Allow sufficient time for rendering',
      '',
      'Audio Production:',
      '• Test voices before committing to full episode',
      '• Use the same voice actor for character consistency',
      '• Add background audio and music for polish',
      '• Review lip-sync alignment carefully',
      '',
      'Project Management:',
      '• Set realistic timelines for each stage',
      '• Monitor costs in Production Economics',
      '• Keep detailed notes in episode descriptions',
      '• Back up completed work regularly'
    ]
  },
  {
    id: 'next-steps',
    title: 'Getting Started Today',
    icon: '✅',
    content: [
      'Ready to create? Here\'s how to get started immediately:',
      '',
      '1. Go to Dashboard and review your workspace',
      '2. Create your first show:',
      '   - Give it a title and description',
      '   - Choose a format (full episodes or shorts)',
      '3. Create 1-2 main characters with reference images',
      '4. Write or upload a short script (3-5 minutes)',
      '5. Create one episode linking to your script',
      '6. Generate storyboards to see the visual plan',
      '7. Try generating a single shot video',
      '8. Experience the full pipeline from script to animation',
      '',
      'Start with a short test episode to understand the workflow. Once comfortable, scale up to full production. Each step in the platform is designed to be intuitive, but explore the help tooltips and settings along the way.'
    ]
  },
  {
    id: 'glossary',
    title: 'Glossary & Terminology',
    icon: '📚',
    content: [
      'Episode: A complete animated segment, typically 7-30 minutes',
      'Scene: A section of an episode happening in one location',
      'Shot: An individual camera angle or clip within a scene',
      'Storyboard: Visual plan showing all shots in sequence',
      'Dialogue: Character speech extracted from script',
      'Character Rig: 3D or 2D model of a character ready for animation',
      'Keyframe: A specific pose or position at a point in time',
      'Lip Sync: Alignment of character mouth movements to speech',
      'Voice Provider: API service for text-to-speech (ElevenLabs, Chatterbox, etc.)',
      'Format: Configuration for episode length and visual style',
      'Asset: Any reusable element (character, background, prop)',
      'Render: The process of generating final video from source files',
      'Resolution: Video output quality (1080p, 4K, etc.)',
      'Frame Rate: Animation speed (24fps, 30fps typical)',
      'Workspace: Container for multiple shows and projects',
      'Organization: Entity that owns a workspace'
    ]
  }
];

export function HowToGuide() {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSection, setCurrentSection] = useState('welcome');
  const contentRef = useRef<HTMLDivElement>(null);

  const toggleSection = (id: string) => {
    setExpandedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const filteredSections = sections.filter(section =>
    searchTerm === '' ||
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.content.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleExportPDF = () => {
    const element = contentRef.current;
    if (!element) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AI Animation Studio How To Guide</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 20px;
            }
            h1 { font-size: 28px; margin-bottom: 30px; color: #1e40af; }
            h2 { font-size: 20px; margin-top: 30px; margin-bottom: 15px; color: #1e40af; page-break-after: avoid; }
            p { margin-bottom: 12px; }
            li { margin-bottom: 8px; }
            @page { margin: 20mm; }
            @media print {
              body { padding: 0; }
              h2 { page-break-after: avoid; }
              p { orphans: 3; widows: 3; }
            }
          </style>
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handlePrint = () => {
    window.print();
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-lg p-8 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen size={32} />
          <h1 className="text-4xl font-bold">How To Guide</h1>
        </div>
        <p className="text-blue-100 text-lg">Complete guide to creating animated content with AI Animation Studio</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 print:hidden">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search sections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Download size={20} />
          <span className="hidden sm:inline">Export PDF</span>
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
        >
          <Printer size={20} />
          <span className="hidden sm:inline">Print</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Table of Contents - Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 shadow p-4 sticky top-4 print:hidden">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Contents</h2>
            <nav className="space-y-2">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => {
                    setCurrentSection(section.id);
                    const element = document.getElementById(section.id);
                    element?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`block w-full text-left px-3 py-2 rounded text-sm transition ${
                    currentSection === section.id
                      ? 'bg-blue-100 text-blue-900 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{section.icon}</span>
                  {section.title}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div ref={contentRef} className="space-y-4">
            {filteredSections.map(section => (
              <div key={section.id} id={section.id} className="bg-white rounded-lg border border-gray-200 shadow overflow-hidden">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3 text-left">
                    <span className="text-2xl">{section.icon}</span>
                    <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
                  </div>
                  {expandedSections.includes(section.id) ? (
                    <ChevronUp className="text-gray-600" size={24} />
                  ) : (
                    <ChevronDown className="text-gray-600" size={24} />
                  )}
                </button>

                {expandedSections.includes(section.id) && (
                  <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 space-y-4">
                    {section.content.map((paragraph, idx) => (
                      <p
                        key={idx}
                        className={`${
                          paragraph === ''
                            ? 'h-3'
                            : paragraph.startsWith('•')
                            ? 'ml-4 text-gray-700'
                            : paragraph.includes(':') && !paragraph.includes('Ensure')
                            ? 'font-semibold text-gray-900 mt-4'
                            : 'text-gray-700 leading-relaxed'
                        }`}
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Back to Top Button */}
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition print:hidden lg:hidden"
          >
            <ArrowUp size={24} />
          </button>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { background-color: white; }
          .print\\:hidden { display: none !important; }
          .sticky { position: static !important; }
          .lg\\:col-span-1 { display: none; }
          .lg\\:col-span-3 { grid-column: auto; }

          .bg-white {
            box-shadow: none !important;
            border: 1px solid #e5e7eb !important;
            page-break-inside: avoid;
          }

          button[class*="bg-"] {
            background-color: transparent !important;
            border: 1px solid #000 !important;
            color: #000 !important;
          }

          h2 {
            page-break-after: avoid;
          }

          p {
            orphans: 3;
            widows: 3;
          }
        }
      `}</style>
    </div>
  );
}
