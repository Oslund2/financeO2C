import { useState, useEffect } from 'react';
import { PlayCircle, Clock, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProductionProps {
  seriesId: string | null;
}

export function Production({ seriesId }: ProductionProps) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProductionJobs();
  }, [seriesId]);

  const loadProductionJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('production_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error loading production jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'processing':
        return <TrendingUp className="w-4 h-4 animate-pulse" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const stats = {
    queued: jobs.filter((j) => j.status === 'queued').length,
    processing: jobs.filter((j) => j.status === 'processing').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    failed: jobs.filter((j) => j.status === 'failed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-scripps-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading production queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Production Queue</h1>
          <p className="text-gray-600">Monitor AI generation jobs and production progress</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Queued</div>
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.queued}</div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Processing</div>
              <TrendingUp className="w-5 h-5 text-blue-500 animate-pulse" />
            </div>
            <div className="text-3xl font-bold text-blue-600">{stats.processing}</div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Completed</div>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Failed</div>
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-3xl font-bold text-red-600">{stats.failed}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Recent Jobs</h2>
          </div>

          {jobs.length === 0 ? (
            <div className="p-12 text-center">
              <PlayCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No production jobs yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Start generating content with AI to see jobs appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {jobs.map((job) => (
                <div key={job.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium text-gray-900 capitalize">
                          {job.job_type.replace('_', ' ')}
                        </span>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getStatusColor(job.status)}`}>
                          {getStatusIcon(job.status)}
                          <span className="font-medium">{job.status}</span>
                        </div>
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full border border-gray-200">
                          {job.service}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600 mb-2">
                        {job.entity_type && (
                          <span className="capitalize">{job.entity_type} • </span>
                        )}
                        Started {new Date(job.created_at).toLocaleString()}
                      </div>

                      {job.error_message && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-800">{job.error_message}</p>
                        </div>
                      )}

                      {job.completed_at && (
                        <div className="text-xs text-gray-500 mt-2">
                          Completed {new Date(job.completed_at).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {job.cost_estimate && (
                      <div className="text-right ml-4">
                        <div className="text-sm text-gray-600">Cost</div>
                        <div className="text-lg font-bold text-gray-900">
                          ${job.cost_estimate.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
