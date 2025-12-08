import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Characters } from './components/Characters';
import { Scripts } from './components/Scripts';
import { Assets } from './components/Assets';
import { Episodes } from './components/Episodes';
import { Production } from './components/Production';
import { AIStudio } from './components/AIStudio';
import { Settings } from './components/Settings';
import { StoryboardGenerator } from './components/StoryboardGenerator';
import { StoryboardViewer } from './components/StoryboardViewer';
import { supabase } from './lib/supabase';
import { initializeSampleData } from './utils/sampleData';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [navigationData, setNavigationData] = useState<any>(null);
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeSeries();
  }, []);

  const initializeSeries = async () => {
    try {
      const { data: existingSeries, error: fetchError } = await supabase
        .from('series')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingSeries) {
        setSeriesId(existingSeries.id);
        await initializeSampleData(existingSeries.id);
      } else {
        const { data: newSeries, error: insertError } = await supabase
          .from('series')
          .insert([
            {
              name: 'The Clayville Craniums',
              description: 'An animated claymation series featuring spelling bee adventures',
              theme: 'Scripps National Spelling Bee',
              style_guide: 'Claymation with visible fingerprints and tactile, squash-and-stretch animation. Characters are made of clay with exaggerated emotional expressions.',
            },
          ])
          .select()
          .single();

        if (insertError) throw insertError;
        setSeriesId(newSeries.id);
        await initializeSampleData(newSeries.id);
      }
    } catch (error) {
      console.error('Error initializing series:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (view: string, data?: any) => {
    setCurrentView(view);
    setNavigationData(data || null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-scripps-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-700 font-medium">Loading Spelling Bee Animation Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout currentView={currentView} onNavigate={handleNavigate}>
      {currentView === 'dashboard' && <Dashboard seriesId={seriesId} onNavigate={handleNavigate} />}
      {currentView === 'characters' && <Characters seriesId={seriesId} />}
      {currentView === 'scripts' && <Scripts seriesId={seriesId} onNavigate={handleNavigate} />}
      {currentView === 'assets' && <Assets seriesId={seriesId} />}
      {currentView === 'episodes' && <Episodes seriesId={seriesId} onNavigate={handleNavigate} />}
      {currentView === 'production' && <Production seriesId={seriesId} />}
      {currentView === 'ai-studio' && <AIStudio seriesId={seriesId} onNavigate={handleNavigate} />}
      {currentView === 'storyboard-generator' && <StoryboardGenerator onNavigate={handleNavigate} />}
      {currentView === 'storyboard-viewer' && navigationData?.storyboardId && (
        <StoryboardViewer storyboardId={navigationData.storyboardId} onNavigate={handleNavigate} />
      )}
      {currentView === 'settings' && <Settings />}
    </Layout>
  );
}

export default App;
