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
  const { currentOrganization, loading: orgLoading, error: orgError, retryInitialization } = useOrganization();
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
      const { data: allSeries, error: fetchError } = await supabase
        .from('series')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('archived', false);

      if (fetchError) throw fetchError;

      let selectedSeries = null;

      if (allSeries && allSeries.length > 0) {
        const defaultSeries = allSeries.find((s: any) => s.name === 'Schwawsome');
        selectedSeries = defaultSeries || allSeries[0];
        setSeriesId(selectedSeries.id);
        await initializeSampleData(selectedSeries.id);
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
          <p className="text-xl text-gray-700 font-medium">
            {authLoading ? 'Authenticating...' : orgLoading ? 'Setting up workspace...' : 'Loading Scripps AI Studio...'}
          </p>
          <p className="text-sm text-gray-500 mt-2">This usually takes just a few seconds</p>
        </div>
      </div>
    );
  }

  if (!currentOrganization && !authLoading && !orgLoading && orgError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-white flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Workspace Initialization Issue</h2>
                <p className="text-gray-600">
                  We encountered a problem while setting up your workspace. This is usually temporary and can be resolved quickly.
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">Error Details:</h3>
                  <p className="text-sm text-red-800 font-mono break-words">{orgError}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Try these solutions:</h3>

              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">1</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Click the retry button below</p>
                  <p className="text-xs text-gray-600 mt-1">This solves most temporary connection issues</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="w-6 h-6 bg-gray-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">2</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Check your internet connection</p>
                  <p className="text-xs text-gray-600 mt-1">Make sure you have a stable connection to continue</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="w-6 h-6 bg-gray-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Clear browser cache and refresh</p>
                  <p className="text-xs text-gray-600 mt-1">Sometimes cached data causes initialization issues</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={retryInitialization}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry Initialization
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Clear & Retry
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2">
                  <svg className="w-4 h-4 group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Technical Details
                </summary>
                <div className="mt-3 text-xs text-gray-600 space-y-2 pl-6">
                  <p><strong>Issue:</strong> Organization initialization failed</p>
                  <p><strong>User ID:</strong> {authLoading ? 'Loading...' : 'Available'}</p>
                  <p><strong>Error:</strong> {orgError}</p>
                  <p className="pt-2 text-gray-500">Check the browser console (F12) for more details</p>
                </div>
              </details>
            </div>
          </div>
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
      {currentView === 'episodes' && <Episodes seriesId={seriesId} onNavigate={handleNavigate} navigationData={navigationData} />}
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
