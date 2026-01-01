import { useState } from 'react';
import { Shield, Sparkles, Search, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Info } from 'lucide-react';

export function PatentIntelligenceSettings() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h2 className="text-xl font-bold text-gray-900">Patent Intelligence System</h2>
            <p className="text-sm text-gray-600">AI-powered patent analysis and generation</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-6 h-6 text-gray-400" />
        ) : (
          <ChevronDown className="w-6 h-6 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-200 p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">AI-Enhanced Patent Generation</h4>
                <p className="text-sm text-blue-800 mb-3">
                  The patent intelligence system automatically analyzes your codebase to identify novel features,
                  searches for relevant prior art, and generates comprehensive patent applications optimized for USPTO approval.
                </p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Automatic feature extraction and novelty analysis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Prior art search using Google Patents and USPTO databases</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>AI-generated specifications with technical depth</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Smart claims generation with broad and narrow scopes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Differentiation analysis showing advantages over prior art</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Key Features
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">Automatic Feature Extraction</h5>
                <p className="text-sm text-gray-600">
                  Scans your codebase to identify:
                </p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1 ml-4">
                  <li>Novel algorithms and data structures</li>
                  <li>Unique integration patterns</li>
                  <li>Performance optimizations</li>
                  <li>Technical innovations</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Prior Art Search
                </h5>
                <p className="text-sm text-gray-600">
                  Automatically searches:
                </p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1 ml-4">
                  <li>Google Patents database</li>
                  <li>USPTO PatentsView API</li>
                  <li>Related patent citations</li>
                  <li>Manual patent entry option</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">Novelty Analysis</h5>
                <p className="text-sm text-gray-600">
                  AI evaluates:
                </p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1 ml-4">
                  <li>Feature novelty strength</li>
                  <li>Approval probability score</li>
                  <li>Patentability assessment</li>
                  <li>Improvement recommendations</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">Intelligent Generation</h5>
                <p className="text-sm text-gray-600">
                  Creates:
                </p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1 ml-4">
                  <li>Technically detailed specifications</li>
                  <li>Independent and dependent claims</li>
                  <li>USPTO-compliant abstracts</li>
                  <li>Differentiation arguments</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">How to Use</h4>
            <ol className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-medium">
                  1
                </span>
                <div>
                  <strong className="text-gray-900">Create Patent Application</strong>
                  <p>Navigate to AI Studio and create a new patent application with a title and description</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-medium">
                  2
                </span>
                <div>
                  <strong className="text-gray-900">Run AI Analysis</strong>
                  <p>Click "Generate with AI" to start automatic feature extraction and prior art search</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-medium">
                  3
                </span>
                <div>
                  <strong className="text-gray-900">Review Analysis</strong>
                  <p>Review novelty scores, prior art findings, and patentability assessment</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-medium">
                  4
                </span>
                <div>
                  <strong className="text-gray-900">Edit and Refine</strong>
                  <p>Customize the generated specification, claims, and drawings as needed</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-medium">
                  5
                </span>
                <div>
                  <strong className="text-gray-900">Export Application</strong>
                  <p>Export complete patent application as PDF for USPTO submission</p>
                </div>
              </li>
            </ol>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900 mb-1">Important Notes</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>AI-generated patents should be reviewed by a patent attorney before filing</li>
                  <li>The system identifies technical innovations in your actual codebase</li>
                  <li>Prior art search results are AI-generated examples for demonstration</li>
                  <li>Edit all sections to ensure accuracy and completeness</li>
                  <li>Approval scores are estimates based on novelty analysis</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
