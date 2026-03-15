import { useState } from 'react';
import { Layout, View } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { WorkflowMap } from './components/WorkflowMap';
import { SavingsCalculator } from './components/SavingsCalculator';
import { ScenarioModeler } from './components/ScenarioModeler';
import { PresentationMode } from './components/PresentationMode';
import { DataExplorer } from './components/DataExplorer';
import { AIDemo } from './components/AIDemo';
import { useWorkflow } from './hooks/useWorkflow';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const workflow = useWorkflow();

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
        />
      )}
      {currentView === 'savings' && (
        <SavingsCalculator
          baselineSteps={workflow.baselineSteps}
          automatedSteps={workflow.automatedSteps}
          assumptions={workflow.assumptions}
          enabledPhases={workflow.enabledPhases}
          onUpdateAssumptions={workflow.updateAssumptions}
        />
      )}
      {currentView === 'scenarios' && (
        <ScenarioModeler
          baselineSteps={workflow.baselineSteps}
          automatedSteps={workflow.automatedSteps}
          assumptions={workflow.assumptions}
          enabledPhases={workflow.enabledPhases}
          onTogglePhase={workflow.togglePhase}
        />
      )}
      {currentView === 'data' && <DataExplorer />}
      {currentView === 'ai-demo' && <AIDemo />}
    </Layout>
  );
}

export default App;
