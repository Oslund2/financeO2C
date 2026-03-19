import { useState } from 'react';
import { Layout, View } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { WorkflowMap } from './components/WorkflowMap';
import { SavingsCalculator } from './components/SavingsCalculator';
import { ScenarioModeler } from './components/ScenarioModeler';
import { PresentationMode } from './components/PresentationMode';
import { DataExplorer } from './components/DataExplorer';
import { AIDemo } from './components/AIDemo';
import { HowItWorks } from './components/HowItWorks';
import { ClientIntake } from './components/ClientIntake';
import { AIChatbot } from './components/AIChatbot';
import { useWorkflow } from './hooks/useWorkflow';
import { calculateSavings, calculatePhaseBreakdown, formatCurrency, formatNumber } from './lib/calculations';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const workflow = useWorkflow();

  // Build context string for chatbot based on current state
  const savings = calculateSavings(
    workflow.baselineSteps, workflow.automatedSteps,
    workflow.assumptions, workflow.enabledPhases
  );
  const chatContext = `Current view: ${currentView}
Active phases: ${workflow.enabledPhases.length}/7
Total workflow steps: ${workflow.baselineSteps.length}
Monthly manual hours: ${formatNumber(savings.manualHoursPerMonth, 0)}
Monthly automated hours: ${formatNumber(savings.automatedHoursPerMonth, 0)}
Hours saved/month: ${formatNumber(savings.hoursSavedPerMonth, 0)}
FTE freed: ${formatNumber(savings.fteSaved)}
Net savings/year: ${formatCurrency(savings.netSavingsPerYear)}
ROI breakeven: ${savings.roiMonths} months
Assumptions: ${JSON.stringify(workflow.assumptions)}`;

  if (currentView === 'presentation') {
    return (
      <PresentationMode
        baselineSteps={workflow.baselineSteps}
        automatedSteps={workflow.automatedSteps}
        assumptions={workflow.assumptions}
        enabledPhases={workflow.enabledPhases}
        onExit={() => setCurrentView('dashboard')}
      />
    );
  }

  return (
    <>
      <Layout currentView={currentView} onNavigate={setCurrentView}>
        {currentView === 'dashboard' && (
          <Dashboard
            baselineSteps={workflow.baselineSteps}
            automatedSteps={workflow.automatedSteps}
            assumptions={workflow.assumptions}
            enabledPhases={workflow.enabledPhases}
            onNavigate={setCurrentView}
          />
        )}
        {currentView === 'workflow' && (
          <WorkflowMap
            baselineSteps={workflow.baselineSteps}
            automatedSteps={workflow.automatedSteps}
            onEditStep={workflow.updateBaselineStep}
            onAddStep={workflow.addStep}
            onRemoveStep={workflow.removeStep}
            enabledPhases={workflow.enabledPhases}
            onTogglePhase={workflow.togglePhase}
            assumptions={workflow.assumptions}
            onNavigate={setCurrentView}
          />
        )}
        {currentView === 'savings' && (
          <SavingsCalculator
            baselineSteps={workflow.baselineSteps}
            automatedSteps={workflow.automatedSteps}
            assumptions={workflow.assumptions}
            enabledPhases={workflow.enabledPhases}
            onUpdateAssumptions={workflow.updateAssumptions}
            onNavigate={setCurrentView}
          />
        )}
        {currentView === 'scenarios' && (
          <ScenarioModeler
            baselineSteps={workflow.baselineSteps}
            automatedSteps={workflow.automatedSteps}
            assumptions={workflow.assumptions}
            enabledPhases={workflow.enabledPhases}
            onTogglePhase={workflow.togglePhase}
            onNavigate={setCurrentView}
          />
        )}
        {currentView === 'how-it-works' && <HowItWorks onNavigate={setCurrentView} />}
        {currentView === 'client-intake' && <ClientIntake onNavigate={setCurrentView} />}
        {currentView === 'data' && <DataExplorer onNavigate={setCurrentView} />}
        {currentView === 'ai-demo' && <AIDemo onNavigate={setCurrentView} />}
      </Layout>
      <AIChatbot context={chatContext} />
    </>
  );
}

export default App;
