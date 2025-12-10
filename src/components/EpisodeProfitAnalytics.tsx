import { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  DollarSign,
  TrendingUp,
  Film,
  User,
  ChevronRight,
  ChevronLeft,
  Search,
  CheckCircle,
  Clock,
  BarChart3,
  FileSpreadsheet,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { CostComparison } from './CostComparison';
import { ShowRevenueEstimator, type RevenueCalculations } from './ShowRevenueEstimator';
import type { CostComparison as CostComparisonType } from '../services/costCalculationService';
import { LTVCalculationService } from '../services/ltvCalculationService';
import jsPDF from 'jspdf';

type Episode = Database['public']['Tables']['episodes']['Row'];
type Character = Database['public']['Tables']['characters']['Row'];

interface EpisodeProfitAnalyticsProps {
  seriesId: string | null;
}

export function EpisodeProfitAnalytics({ seriesId }: EpisodeProfitAnalyticsProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [primaryCharacter, setPrimaryCharacter] = useState<Character | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const [showCostHelp, setShowCostHelp] = useState(false);
  const [revenueCalculations, setRevenueCalculations] = useState<RevenueCalculations | null>(null);

  useEffect(() => {
    loadEpisodes();
    loadCharacters();
  }, [seriesId]);

  useEffect(() => {
    if (selectedEpisode && characters.length > 0) {
      determinePrimaryCharacter(selectedEpisode);
    }
  }, [selectedEpisode, characters]);

  const loadEpisodes = async () => {
    try {
      let query = supabase
        .from('episodes')
        .select('*')
        .order('created_at', { ascending: false });

      if (seriesId) {
        query = query.eq('series_id', seriesId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEpisodes(data || []);

      if (data && data.length > 0 && !selectedEpisode) {
        setSelectedEpisode(data[0]);
      }
    } catch (error) {
      console.error('Error loading episodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCharacters = async () => {
    try {
      let query = supabase
        .from('characters')
        .select('*')
        .eq('role', 'primary');

      if (seriesId) {
        query = query.eq('series_id', seriesId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCharacters(data || []);
    } catch (error) {
      console.error('Error loading characters:', error);
    }
  };

  const determinePrimaryCharacter = async (episode: Episode) => {
    if (characters.length === 0) {
      setPrimaryCharacter(null);
      return;
    }

    if (episode.script_id) {
      try {
        const { data: script } = await supabase
          .from('scripts')
          .select('*, script_acts(*)')
          .eq('id', episode.script_id)
          .maybeSingle();

        if (script && script.script_acts) {
          const characterDialogueCounts = new Map<string, number>();

          for (const act of script.script_acts as any[]) {
            const { data: scenes } = await supabase
              .from('script_scenes')
              .select('dialogue')
              .eq('act_id', act.id);

            if (scenes) {
              scenes.forEach((scene) => {
                if (scene.dialogue && Array.isArray(scene.dialogue)) {
                  (scene.dialogue as any[]).forEach((line) => {
                    const charName = line.character;
                    if (charName) {
                      characterDialogueCounts.set(
                        charName,
                        (characterDialogueCounts.get(charName) || 0) + 1
                      );
                    }
                  });
                }
              });
            }
          }

          let maxDialogue = 0;
          let primaryCharName = '';
          characterDialogueCounts.forEach((count, name) => {
            if (count > maxDialogue) {
              maxDialogue = count;
              primaryCharName = name;
            }
          });

          const matchedChar = characters.find(
            (c) => c.name.toLowerCase() === primaryCharName.toLowerCase()
          );

          setPrimaryCharacter(matchedChar || characters[0]);
        } else {
          setPrimaryCharacter(characters[0]);
        }
      } catch (error) {
        console.error('Error determining primary character:', error);
        setPrimaryCharacter(characters[0]);
      }
    } else {
      setPrimaryCharacter(characters[0]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'review':
        return 'bg-blue-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const exportToCSV = () => {
    if (!selectedEpisode) return;

    setExporting('csv');

    try {
      const snapshot = selectedEpisode.source_script_snapshot as any;
      const costComparison: CostComparisonType | null = snapshot?.cost_comparison || null;

      const headers = [
        'Episode Title',
        'Status',
        'Progress %',
        'Estimated Cost (AI)',
        'Actual Cost',
        'AI Base Cost',
        'AI Acts Cost',
        'AI Scenes Cost',
        'AI Characters Cost',
        'AI Voice Lines Cost',
        'AI Video Generation Cost',
        'AI Complexity Adjustment',
        'Traditional Base Cost',
        'Traditional Acts Cost',
        'Traditional Scenes Cost',
        'Traditional Characters Cost',
        'Traditional Video Generation Cost',
        'Traditional Complexity Adjustment',
        'Total Savings',
        'Savings %',
        'Created Date',
        'Completed Date'
      ];

      const row: any[] = [
        selectedEpisode.title,
        selectedEpisode.status,
        selectedEpisode.progress_percentage,
        selectedEpisode.estimated_cost || 0,
        selectedEpisode.actual_cost || 0,
        costComparison?.aiCost.baseCost || 0,
        costComparison?.aiCost.actsCost || 0,
        costComparison?.aiCost.scenesCost || 0,
        costComparison?.aiCost.charactersCost || 0,
        costComparison?.aiCost.voicesCost || 0,
        costComparison?.aiCost.videoGenerationCost || 0,
        costComparison?.aiCost.complexityAdjustment || 0,
        costComparison?.traditionalCost.baseCost || 0,
        costComparison?.traditionalCost.actsCost || 0,
        costComparison?.traditionalCost.scenesCost || 0,
        costComparison?.traditionalCost.charactersCost || 0,
        costComparison?.traditionalCost.videoGenerationCost || 0,
        costComparison?.traditionalCost.complexityAdjustment || 0,
        costComparison?.savings || 0,
        costComparison?.savingsPercentage || 0,
        new Date(selectedEpisode.created_at).toLocaleDateString(),
        selectedEpisode.completed_at ? new Date(selectedEpisode.completed_at).toLocaleDateString() : 'In Progress'
      ];

      if (revenueCalculations) {
        headers.push(
          'Annual Revenue (Year 1)',
          'Years in Service',
          'Decay Rate %',
          'Minimum Retention %',
          'Lifetime Revenue',
          'Lifetime Profit',
          'Lifetime Margin %',
          'Payback Period (Years)',
          'Average Annual Profit'
        );
        row.push(
          revenueCalculations.totalRevenue,
          revenueCalculations.yearsInService,
          revenueCalculations.decayRatePercent,
          revenueCalculations.minimumRetentionPercent,
          revenueCalculations.lifetimeRevenue,
          revenueCalculations.lifetimeProfit,
          revenueCalculations.lifetimeMargin.toFixed(2),
          revenueCalculations.paybackPeriodYears?.toFixed(2) || 'N/A',
          revenueCalculations.averageAnnualProfit
        );

        for (let i = 1; i <= revenueCalculations.yearsInService; i++) {
          const yearData = revenueCalculations.ltvCalculation.yearlyBreakdown[i - 1];
          if (yearData) {
            headers.push(`Year ${i} Revenue`);
            row.push(yearData.revenue.toFixed(2));
          }
        }
      }

      const csvContent = [
        headers.join(','),
        row.map(field => `"${field}"`).join(',')
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `episode-profit-analysis-${selectedEpisode.title.replace(/\s+/g, '-')}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV');
    } finally {
      setExporting(null);
    }
  };

  const exportToPDF = () => {
    if (!selectedEpisode) return;

    setExporting('pdf');

    try {
      const doc = new jsPDF();
      const snapshot = selectedEpisode.source_script_snapshot as any;
      const costComparison: CostComparisonType | null = snapshot?.cost_comparison || null;

      let yPos = 20;
      const leftMargin = 15;
      const rightMargin = 195;
      const lineHeight = 7;
      const sectionSpacing = 10;

      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Episode Profit Analysis Report', 105, yPos, { align: 'center' });

      yPos += 10;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(selectedEpisode.title, 105, yPos, { align: 'center' });

      yPos += 7;
      doc.setFontSize(10);
      doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 105, yPos, { align: 'center' });

      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.5);
      doc.line(leftMargin, yPos + 3, rightMargin, yPos + 3);

      yPos += sectionSpacing + 5;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Episode Information', leftMargin, yPos);
      yPos += lineHeight;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Status: ${selectedEpisode.status}`, leftMargin, yPos);
      doc.text(`Progress: ${selectedEpisode.progress_percentage}%`, 110, yPos);
      yPos += lineHeight;

      doc.text(`Created: ${new Date(selectedEpisode.created_at).toLocaleDateString()}`, leftMargin, yPos);
      doc.text(`Completed: ${selectedEpisode.completed_at ? new Date(selectedEpisode.completed_at).toLocaleDateString() : 'In Progress'}`, 110, yPos);
      yPos += sectionSpacing;

      if (costComparison) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Cost Analysis', leftMargin, yPos);
        yPos += lineHeight;

        doc.setFontSize(12);
        doc.text('AI-Assisted Production', leftMargin, yPos);
        yPos += lineHeight - 1;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Base Cost: $${costComparison.aiCost.baseCost.toFixed(2)}`, leftMargin + 5, yPos);
        yPos += lineHeight - 1;
        doc.text(`Acts: $${costComparison.aiCost.actsCost.toFixed(2)}`, leftMargin + 5, yPos);
        yPos += lineHeight - 1;
        doc.text(`Scenes: $${costComparison.aiCost.scenesCost.toFixed(2)}`, leftMargin + 5, yPos);
        yPos += lineHeight - 1;
        doc.text(`Characters: $${costComparison.aiCost.charactersCost.toFixed(2)}`, leftMargin + 5, yPos);
        yPos += lineHeight - 1;
        doc.text(`Voice Lines: $${costComparison.aiCost.voicesCost.toFixed(2)}`, leftMargin + 5, yPos);
        yPos += lineHeight - 1;
        doc.text(`Video Generation: $${costComparison.aiCost.videoGenerationCost.toFixed(2)}`, leftMargin + 5, yPos);
        yPos += lineHeight - 1;
        doc.text(`Complexity Adjustment: $${costComparison.aiCost.complexityAdjustment.toFixed(2)}`, leftMargin + 5, yPos);
        yPos += lineHeight - 1;

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(5, 150, 105);
        doc.text(`Total AI Cost: $${costComparison.aiCost.totalCost.toFixed(2)}`, leftMargin + 5, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += sectionSpacing;

        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Traditional Production', leftMargin, yPos);
        yPos += lineHeight - 1;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Base Cost: $${costComparison.traditionalCost.baseCost.toFixed(2)}`, leftMargin + 5, yPos);
        yPos += lineHeight - 1;
        doc.text(`Acts: $${costComparison.traditionalCost.actsCost.toFixed(2)}`, leftMargin + 5, yPos);
        yPos += lineHeight - 1;
        doc.text(`Scenes: $${costComparison.traditionalCost.scenesCost.toFixed(2)}`, leftMargin + 5, yPos);
        yPos += lineHeight - 1;
        doc.text(`Characters: $${costComparison.traditionalCost.charactersCost.toFixed(2)}`, leftMargin + 5, yPos);
        yPos += lineHeight - 1;
        doc.text(`Video Generation: $${costComparison.traditionalCost.videoGenerationCost.toFixed(2)}`, leftMargin + 5, yPos);
        yPos += lineHeight - 1;
        doc.text(`Complexity Adjustment: $${costComparison.traditionalCost.complexityAdjustment.toFixed(2)}`, leftMargin + 5, yPos);
        yPos += lineHeight - 1;

        doc.setFont('helvetica', 'bold');
        doc.text(`Total Traditional Cost: $${costComparison.traditionalCost.totalCost.toFixed(2)}`, leftMargin + 5, yPos);
        yPos += sectionSpacing;

        doc.setFontSize(12);
        doc.text('Savings Summary', leftMargin, yPos);
        yPos += lineHeight - 1;

        doc.setFontSize(10);
        doc.setTextColor(5, 150, 105);
        doc.text(`Total Savings: $${costComparison.savings.toFixed(2)}`, leftMargin + 5, yPos);
        yPos += lineHeight - 1;
        doc.text(`Savings Percentage: ${costComparison.savingsPercentage.toFixed(1)}%`, leftMargin + 5, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += sectionSpacing;

        if (selectedEpisode.actual_cost) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Actual vs Estimated', leftMargin, yPos);
          yPos += lineHeight - 1;

          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`Estimated Cost: $${(selectedEpisode.estimated_cost || 0).toFixed(2)}`, leftMargin + 5, yPos);
          yPos += lineHeight - 1;
          doc.text(`Actual Cost: $${selectedEpisode.actual_cost.toFixed(2)}`, leftMargin + 5, yPos);
          yPos += lineHeight - 1;

          const variance = selectedEpisode.actual_cost - (selectedEpisode.estimated_cost || 0);
          if (variance <= 0) {
            doc.setTextColor(5, 150, 105);
          } else {
            doc.setTextColor(220, 38, 38);
          }
          doc.text(`Variance: ${variance <= 0 ? '-' : '+'}$${Math.abs(variance).toFixed(2)}`, leftMargin + 5, yPos);
          doc.setTextColor(0, 0, 0);
          yPos += sectionSpacing;
        }
      }

      if (revenueCalculations) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Lifetime Value Analysis', leftMargin, yPos);
        yPos += lineHeight;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Annual Revenue (Year 1): $${revenueCalculations.totalRevenue.toFixed(2)}`, leftMargin, yPos);
        yPos += lineHeight - 1;
        doc.text(`Years in Service: ${revenueCalculations.yearsInService} years`, leftMargin, yPos);
        yPos += lineHeight - 1;
        doc.text(`Decay Rate: ${revenueCalculations.decayRatePercent}% per year`, leftMargin, yPos);
        yPos += lineHeight - 1;
        doc.text(`Minimum Retention Floor: ${revenueCalculations.minimumRetentionPercent}%`, leftMargin, yPos);
        yPos += lineHeight - 1;

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(5, 150, 105);
        doc.text(`Lifetime Revenue: $${revenueCalculations.lifetimeRevenue.toFixed(2)}`, leftMargin, yPos);
        yPos += lineHeight - 1;

        if (revenueCalculations.lifetimeProfit >= 0) {
          doc.setTextColor(5, 150, 105);
        } else {
          doc.setTextColor(220, 38, 38);
        }
        doc.text(`Lifetime Profit: $${revenueCalculations.lifetimeProfit.toFixed(2)}`, leftMargin, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += lineHeight - 1;

        doc.setFont('helvetica', 'normal');
        doc.text(`Payback Period: ${revenueCalculations.paybackPeriodYears ? revenueCalculations.paybackPeriodYears.toFixed(2) + ' years' : 'Not reached'}`, leftMargin, yPos);
        yPos += lineHeight - 1;
        doc.text(`Average Annual Profit: $${revenueCalculations.averageAnnualProfit.toFixed(2)}`, leftMargin, yPos);
        yPos += sectionSpacing;

        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Year-by-Year Revenue Projection', leftMargin, yPos);
        yPos += lineHeight - 1;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        revenueCalculations.ltvCalculation.yearlyBreakdown.forEach((yearData) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`Year ${yearData.year} (${yearData.retentionPercent.toFixed(0)}% retention): $${yearData.revenue.toFixed(2)}`, leftMargin + 5, yPos);
          yPos += lineHeight - 2;
        });

        yPos += 2;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(5, 150, 105);
        doc.text(`Total Lifetime Revenue: $${revenueCalculations.lifetimeRevenue.toFixed(2)}`, leftMargin + 5, yPos);
        doc.setTextColor(0, 0, 0);
      }

      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      } else {
        yPos = 270;
      }

      doc.setDrawColor(229, 231, 235);
      doc.line(leftMargin, yPos, rightMargin, yPos);
      yPos += 5;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text('This report was generated by the Animation Studio Profit Analytics System', 105, yPos, { align: 'center' });
      yPos += 5;
      doc.text('Confidential Business Information - For Internal Use Only', 105, yPos, { align: 'center' });

      const fileName = `Episode_Analysis_${selectedEpisode.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      setExporting(null);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF');
      setExporting(null);
    }
  };

  const filteredEpisodes = episodes.filter(ep =>
    ep.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleRevenueCalculationsChange = (calculations: RevenueCalculations) => {
    setRevenueCalculations(calculations);
  };

  const getEpisodeMetrics = (episode: Episode) => {
    const productionCost = episode.actual_cost || episode.estimated_cost || 0;
    const yearsInService = revenueCalculations?.yearsInService || episode.projected_service_years || 5;
    const decayRate = revenueCalculations?.decayRatePercent || episode.decay_rate_percent || 10;
    const minRetention = revenueCalculations?.minimumRetentionPercent || episode.minimum_retention_percent || 20;

    let annualRevenue: number;
    let perEpisodeProductionCost = productionCost;

    if (revenueCalculations) {
      annualRevenue = revenueCalculations.revenuePerEpisode;
      const episodesInEstimator = revenueCalculations.totalRevenue / revenueCalculations.revenuePerEpisode;
      perEpisodeProductionCost = revenueCalculations.adjustedProductionCost / episodesInEstimator;
    } else {
      annualRevenue = productionCost * 4;
    }

    const ltvData = LTVCalculationService.calculateLifetimeValue(
      annualRevenue,
      perEpisodeProductionCost,
      yearsInService,
      decayRate,
      minRetention
    );

    return {
      annualRevenue: ltvData.annualRevenue,
      profit: ltvData.lifetimeProfit,
      margin: ltvData.lifetimeMargin
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-200">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Episodes Available</h3>
            <p className="text-gray-600">Create and complete episodes to view profit analytics.</p>
          </div>
        </div>
      </div>
    );
  }

  const snapshot = selectedEpisode?.source_script_snapshot as any;
  const costComparison: CostComparisonType | null = snapshot?.cost_comparison || null;
  const productionCost = selectedEpisode?.actual_cost || selectedEpisode?.estimated_cost || 0;

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Profit Per Episode Analytics</h1>
              <p className="text-gray-600">Comprehensive business analysis and profitability metrics</p>
            </div>
            <div className="flex items-center gap-3">
            <button
              onClick={exportToCSV}
              disabled={!selectedEpisode || exporting === 'csv'}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === 'csv' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-5 h-5" />
                  Export CSV
                </>
              )}
            </button>
            <button
              onClick={exportToPDF}
              disabled={!selectedEpisode || exporting === 'pdf'}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === 'pdf' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Export PDF
                </>
              )}
            </button>
          </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowCostHelp(!showCostHelp)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-blue-100/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Info className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">How Production Costs Are Calculated</h3>
                  <p className="text-sm text-gray-600">Learn how your script structure impacts costs</p>
                </div>
              </div>
              {showCostHelp ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {showCostHelp && (
              <div className="px-6 pb-6 border-t border-blue-200">
                <div className="grid md:grid-cols-2 gap-6 mt-4">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Cost Components from Script</h4>

                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-blue-700 font-bold text-sm">1</span>
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900 mb-1">Runtime Minutes</h5>
                          <p className="text-sm text-gray-600">
                            Your base cost starts with the episode runtime. More dialogue and scenes = longer runtime = higher base cost.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-blue-700 font-bold text-sm">2</span>
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900 mb-1">Acts & Scenes</h5>
                          <p className="text-sm text-gray-600">
                            Each act and scene in your script requires setup. More acts and scenes = more AI generation cycles and processing.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-blue-700 font-bold text-sm">3</span>
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900 mb-1">Unique Characters</h5>
                          <p className="text-sm text-gray-600">
                            Each new character requires initial model generation and consistency management across scenes. Limit characters to reduce costs.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Cost-Saving Tips</h4>

                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                          <DollarSign className="w-4 h-4 text-green-700" />
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900 mb-1">Voice Lines Matter</h5>
                          <p className="text-sm text-gray-600">
                            Each dialogue line costs money. Write concise dialogue that moves the story forward efficiently.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                          <DollarSign className="w-4 h-4 text-green-700" />
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900 mb-1">Scene Complexity</h5>
                          <p className="text-sm text-gray-600">
                            Avoid keywords like "elaborate" or "complex" in scene descriptions unless necessary. Simple scenes cost less.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                          <DollarSign className="w-4 h-4 text-green-700" />
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900 mb-1">Reuse Characters</h5>
                          <p className="text-sm text-gray-600">
                            Focus on your core cast. Each new character adds setup costs. Reusing existing characters is more cost-effective.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-blue-200 bg-white rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    The Bottom Line
                  </h4>
                  <p className="text-sm text-gray-700">
                    Even with all cost components, AI-assisted production typically costs <strong>85-90% less</strong> than
                    traditional animation. Traditional methods require physical materials, manual labor, and extensive studio
                    time, while AI automates character creation, scene generation, and voice acting in minutes instead of months.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search episodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Film className="w-4 h-4" />
              Select Episode ({filteredEpisodes.length} available)
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {filteredEpisodes.map((episode) => {
                const metrics = getEpisodeMetrics(episode);
                return (
                  <button
                    key={episode.id}
                    onClick={() => setSelectedEpisode(episode)}
                    className={`flex-shrink-0 w-72 p-4 rounded-lg border-2 transition-all text-left ${
                      selectedEpisode?.id === episode.id
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(episode.status)}
                        <span className="text-xs font-medium text-gray-600 capitalize">
                          {episode.status}
                        </span>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(episode.status)}`}></div>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-3 line-clamp-2">{episode.title}</h4>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Year 1 Revenue</span>
                        <span className="text-sm font-bold text-blue-700">
                          {formatCurrency(metrics.annualRevenue)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Lifetime Profit</span>
                        <span className={`text-sm font-bold ${
                          metrics.profit >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {formatCurrency(metrics.profit)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Lifetime Margin</span>
                        <span className={`text-sm font-bold ${
                          metrics.margin >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {metrics.margin.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 font-medium">Return on Investment</span>
                        <span className="text-sm font-bold text-blue-700">
                          {(() => {
                            const cost = episode.actual_cost || episode.estimated_cost || 0;
                            if (cost === 0) return 'N/A';
                            const totalReturn = metrics.profit + cost;
                            const roiMultiple = totalReturn / cost;
                            return `${roiMultiple.toFixed(0)}x`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {selectedEpisode && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-md border-2 border-blue-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedEpisode.title}</h2>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(selectedEpisode.status)}
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {selectedEpisode.status}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        Created: {new Date(selectedEpisode.created_at).toLocaleDateString()}
                      </span>
                      {selectedEpisode.completed_at && (
                        <span className="text-sm text-green-700 font-medium">
                          Completed: {new Date(selectedEpisode.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="text-xs text-gray-600 mb-1">Progress</div>
                    <div className="text-2xl font-bold text-blue-700">{selectedEpisode.progress_percentage}%</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="text-xs text-gray-600 mb-1">Est. Cost (AI)</div>
                    <div className="text-2xl font-bold text-green-700">
                      {selectedEpisode.estimated_cost ? formatCurrency(selectedEpisode.estimated_cost) : 'N/A'}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="text-xs text-gray-600 mb-1">Actual Cost</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {selectedEpisode.actual_cost ? formatCurrency(selectedEpisode.actual_cost) : 'TBD'}
                    </div>
                  </div>
                </div>
              </div>

              {primaryCharacter && (
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl shadow-md border-2 border-pink-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-pink-700" />
                    <h3 className="text-lg font-bold text-gray-900">Featured Character</h3>
                  </div>
                  {primaryCharacter.reference_image_url ? (
                    <div className="mb-3">
                      <img
                        src={primaryCharacter.reference_image_url}
                        alt={primaryCharacter.name}
                        className="w-full h-40 object-cover rounded-lg border-2 border-pink-300"
                      />
                    </div>
                  ) : (
                    <div className="mb-3 w-full h-40 bg-pink-100 rounded-lg border-2 border-pink-300 flex items-center justify-center">
                      <User className="w-16 h-16 text-pink-400" />
                    </div>
                  )}
                  <h4 className="font-bold text-gray-900 text-lg mb-1">{primaryCharacter.name}</h4>
                  {primaryCharacter.age && (
                    <p className="text-sm text-gray-600 mb-2">Age: {primaryCharacter.age}</p>
                  )}
                  {primaryCharacter.description && (
                    <p className="text-sm text-gray-700 line-clamp-3">{primaryCharacter.description}</p>
                  )}
                </div>
              )}
            </div>

            {costComparison && (
              <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Production Cost Analysis</h3>
                    <p className="text-sm text-gray-600">AI-Assisted vs Traditional Animation Comparison</p>
                  </div>
                </div>

                <CostComparison comparison={costComparison} showDetailed={true} />

                {selectedEpisode.actual_cost && (
                  <div className="mt-6 bg-gray-50 border-2 border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Actual vs Estimated Cost</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Estimated Cost</div>
                        <div className="text-2xl font-bold text-green-700">
                          {formatCurrency(selectedEpisode.estimated_cost || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Actual Cost</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency(selectedEpisode.actual_cost)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Variance</div>
                        <div className={`text-2xl font-bold ${
                          selectedEpisode.actual_cost <= (selectedEpisode.estimated_cost || 0)
                            ? 'text-green-700'
                            : 'text-red-700'
                        }`}>
                          {selectedEpisode.actual_cost <= (selectedEpisode.estimated_cost || 0) ? '-' : '+'}
                          {formatCurrency(Math.abs(selectedEpisode.actual_cost - (selectedEpisode.estimated_cost || 0)))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Revenue & Profit Projections</h3>
                  <p className="text-sm text-gray-600">Multi-channel revenue estimator and profitability calculator</p>
                </div>
              </div>

              <ShowRevenueEstimator
                initialProductionCost={productionCost}
                onCalculationsChange={handleRevenueCalculationsChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
