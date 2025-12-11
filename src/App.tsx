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
import BackupRecovery from './components/BackupRecovery';
import { EpisodeProfitAnalytics } from './components/EpisodeProfitAnalytics';
import { supabase } from './lib/supabase';
import { initializeSampleData } from './utils/sampleData';
import { useAuth } from './contexts/AuthContext';
import { useOrganization } from './contexts/OrganizationContext';

function App() {
  const { user, loading: authLoading } = useAuth();
  const { currentOrganization, loading: orgLoading } = useOrganization();
  const [currentView, setCurrentView] = useState('dashboard');
  const [navigationData, setNavigationData] = useState<any>(null);
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !orgLoading && currentOrganization) {
      initializeSeries();
    } else if (!authLoading && !orgLoading) {
      setLoading(false);
    }
  }, [currentOrganization, authLoading, orgLoading]);

  const initializeSeries = async () => {
    if (!currentOrganization) {
      setLoading(false);
      return;
    }

    try {
      const { data: existingSeries, error: fetchError } = await supabase
        .from('series')
        .select('*')
        .eq('organization_id', currentOrganization.id)
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
              organization_id: currentOrganization.id,
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

  if (authLoading || orgLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-scripps-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-700 font-medium">Loading Animation Studio...</p>
        </div>
      </div>
    );
  }

  if (!currentOrganization && !authLoading && !orgLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Unable to Initialize Workspace</h2>
          <p className="text-gray-600 mb-6">
            There was an error creating your organization. Please check the browser console for details.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-scripps-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-700 font-medium">Initializing workspace...</p>
        </div>
      </div>
    );
  }

  const handleSeriesChange = (newSeriesId: string) => {
    setSeriesId(newSeriesId);
    setCurrentView('dashboard');
  };

  return (
    <Layout
      currentView={currentView}
      onNavigate={handleNavigate}
      currentSeriesId={seriesId}
      onSeriesChange={handleSeriesChange}
    >
      {currentView === 'dashboard' && <Dashboard seriesId={seriesId} onNavigate={handleNavigate} />}
      {currentView === 'characters' && <Characters seriesId={seriesId} />}
      {currentView === 'scripts' && <Scripts seriesId={seriesId} onNavigate={handleNavigate} />}
      {currentView === 'assets' && <Assets seriesId={seriesId} />}
      {currentView === 'episodes' && <Episodes seriesId={seriesId} onNavigate={handleNavigate} />}
      {currentView === 'profit-per-episode' && <EpisodeProfitAnalytics seriesId={seriesId} />}
      {currentView === 'production' && <Production seriesId={seriesId} />}
      {currentView === 'ai-studio' && <AIStudio seriesId={seriesId} onNavigate={handleNavigate} />}
      {currentView === 'storyboard-generator' && <StoryboardGenerator onNavigate={handleNavigate} />}
      {currentView === 'storyboard-viewer' && navigationData?.storyboardId && (
        <StoryboardViewer storyboardId={navigationData.storyboardId} onNavigate={handleNavigate} />
      )}
      {currentView === 'backup-recovery' && <BackupRecovery />}
      {currentView === 'settings' && <Settings />}
    </Layout>
  );
}

export default App;
