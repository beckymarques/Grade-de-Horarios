import React, { useState } from 'react';
import { ScheduleProvider, useSchedule } from './context/ScheduleContext';
import { Header } from './components/Header';
import { TimetableGrid } from './components/TimetableGrid';
import { ConfigTimes } from './components/ConfigTimes';
import { ConfigClasses } from './components/ConfigClasses';
import { ConfigTeachers } from './components/ConfigTeachers';
import { ConfigLoads } from './components/ConfigLoads';
import { ConfigRules } from './components/ConfigRules';
import { WeeksList } from './components/WeeksList';
import { SolverModal } from './components/SolverModal';
import { ExportModal } from './components/ExportModal';
import { ConflictDrawer } from './components/ConflictDrawer';
import { LayoutSelectorModal } from './components/LayoutSelectorModal';
import { WelcomeTourModal } from './components/WelcomeTourModal';
import { UnsavedTimesModal } from './components/UnsavedTimesModal';

const MainAppContent: React.FC = () => {
  const { activeTab, layoutTheme, setLayoutTheme } = useSchedule();
  const [showSolverModal, setShowSolverModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showConflictsDrawer, setShowConflictsDrawer] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(() => {
    return !localStorage.getItem('prevest_has_completed_tour_v2') && !localStorage.getItem('prevest_has_onboarded_v1');
  });
  const [showLayoutModal, setShowLayoutModal] = useState<boolean>(() => {
    // If onboarding hasn't happened, let onboarding happen first
    return (
      (!!localStorage.getItem('prevest_has_completed_tour_v2') || !!localStorage.getItem('prevest_has_onboarded_v1')) &&
      !localStorage.getItem('prevest_has_chosen_layout_v1')
    );
  });

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header with Responsive Navigation */}
      <Header
        onOpenSolver={() => setShowSolverModal(true)}
        onOpenExport={() => setShowExportModal(true)}
        onOpenConflicts={() => setShowConflictsDrawer(true)}
        onOpenLayoutModal={() => setShowLayoutModal(true)}
        onOpenOnboarding={() => setShowWelcomeModal(true)}
      />

      {/* Main Tab Content */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-3 sm:p-5">
        {activeTab === 'grade' && (
          <TimetableGrid
            onOpenSolver={() => setShowSolverModal(true)}
            onOpenExport={() => setShowExportModal(true)}
            onOpenLayoutModal={() => setShowLayoutModal(true)}
          />
        )}

        {activeTab === 'tempos' && <ConfigTimes />}
        {activeTab === 'turmas' && <ConfigClasses />}
        {activeTab === 'professores' && <ConfigTeachers />}
        {activeTab === 'cargas' && <ConfigLoads />}
        {activeTab === 'regras' && <ConfigRules />}
        {activeTab === 'semanas' && <WeeksList />}
      </main>

      {/* Unsaved Times Warning Modal */}
      <UnsavedTimesModal />

      {/* Guided Welcome Tour Modal */}
      {showWelcomeModal && (
        <WelcomeTourModal
          onClose={() => {
            setShowWelcomeModal(false);
            if (!localStorage.getItem('prevest_has_chosen_layout_v1')) {
              setShowLayoutModal(true);
            }
          }}
          isFirstTime={!localStorage.getItem('prevest_has_completed_tour_v2')}
        />
      )}

      {/* Layout Selection Modal */}
      {showLayoutModal && !showWelcomeModal && (
        <LayoutSelectorModal
          currentTheme={layoutTheme}
          onSelectTheme={(theme) => setLayoutTheme(theme)}
          onClose={() => setShowLayoutModal(false)}
          isInitialSelection={!localStorage.getItem('prevest_has_chosen_layout_v1')}
        />
      )}

      {/* Solver Modal */}
      {showSolverModal && (
        <SolverModal onClose={() => setShowSolverModal(false)} />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal onClose={() => setShowExportModal(false)} />
      )}

      {/* Conflict Validation Drawer */}
      {showConflictsDrawer && (
        <ConflictDrawer onClose={() => setShowConflictsDrawer(false)} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <ScheduleProvider>
      <MainAppContent />
    </ScheduleProvider>
  );
}
