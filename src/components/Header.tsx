import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Users,
  GraduationCap,
  Scale,
  Sparkles,
  Download,
  AlertTriangle,
  Copy,
  Plus,
  FolderOpen,
  Sliders,
  CheckCircle2,
  BookOpen,
  Palette,
  Menu,
  X,
  Upload,
} from 'lucide-react';
import { useSchedule, ActiveTab } from '../context/ScheduleContext';
import { SolverModal } from './SolverModal';
import { ExportModal } from './ExportModal';
import { DuplicateWeekModal } from './DuplicateWeekModal';
import { exportBackupJSON } from '../utils/exportEngine';

interface HeaderProps {
  onOpenConflicts: () => void;
  onOpenSolver?: () => void;
  onOpenExport?: () => void;
  onOpenLayoutModal: () => void;
  onOpenOnboarding?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenConflicts,
  onOpenSolver,
  onOpenExport,
  onOpenLayoutModal,
  onOpenOnboarding,
}) => {
  const {
    weeks,
    activeWeek,
    activeWeekId,
    setActiveWeekId,
    activeTab,
    setActiveTab,
    layoutTheme,
    validation,
    createNewWeek,
    importData,
  } = useSchedule();

  const [showSolverModal, setShowSolverModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showNewWeekModal, setShowNewWeekModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDateRange, setNewDateRange] = useState('');

  const layoutThemeNames: Record<string, string> = {
    classic_table: 'Planilha Clássica',
    modern_cards: 'Cartões Modernos',
    school_board: 'Mural Escolar',
    compact_density: 'Alta Densidade',
  };

  const navItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'grade', label: 'Grade da Semana', icon: Calendar },
    { id: 'tempos', label: 'Tempos do Dia', icon: Clock },
    { id: 'turmas', label: 'Turmas', icon: Users },
    { id: 'professores', label: 'Professores & Salas', icon: GraduationCap },
    { id: 'cargas', label: 'Cargas Horárias', icon: BookOpen },
    { id: 'regras', label: 'Regras da Semana', icon: Scale },
    { id: 'semanas', label: 'Gerenciar Semanas', icon: FolderOpen },
  ];

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createNewWeek(newTitle, newDateRange || 'Próxima Semana');
    setNewTitle('');
    setNewDateRange('');
    setShowNewWeekModal(false);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (Array.isArray(parsed)) {
          importData(parsed);
          alert('Backup restaurado com sucesso!');
        } else if (parsed && parsed.weeks) {
          importData(parsed.weeks);
          alert('Backup restaurado com sucesso!');
        } else {
          alert('Formato de arquivo de backup inválido.');
        }
      } catch (err) {
        alert('Erro ao ler arquivo de backup JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top tier: Title, Week Selector, Quick Action Buttons */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-2.5 sm:py-3 gap-2.5 sm:gap-3">
          
          {/* Logo & App Name */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="22px"
                  viewBox="0 -960 960 960"
                  width="22px"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M130-189 81-546q-5-32 15.5-58t52.5-31l61 435 283-40h267q-8 21-24.5 35.5T695-187l-477 66q-33 5-58-15t-30-53Zm190-127q-33 0-56.5-23.5T240-396v-364q0-33 23.5-56.5T320-840h480q33 0 56.5 23.5T880-760v364q0 33-23.5 56.5T800-316H320Zm0-80h480v-364H320v364Zm0 0v-364 364ZM210-200Zm190-400h320v-80H400v80Zm0 120h200v-80H400v80Z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Gerador de Grade
                  </h1>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Otimizador de horários com verificação ao vivo e tutores em janela
                </p>
              </div>
            </div>

            {/* Mobile menu hamburger toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              title="Abrir menu de navegação"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Week Selector Dropdown & Actions */}
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
            <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-lg border border-slate-200">
              <span className="text-[11px] sm:text-xs font-medium text-slate-500 px-1.5 sm:px-2 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Semana:</span>
              </span>
              <select
                id="select_week"
                value={activeWeekId}
                onChange={(e) => setActiveWeekId(e.target.value)}
                className="bg-white text-xs font-semibold text-slate-800 rounded-md px-2 py-1 sm:px-2.5 sm:py-1.5 border border-slate-300 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 max-w-[140px] sm:max-w-none truncate"
              >
                {weeks.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title} ({w.dateRange})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Duplicate Button */}
            <button
              id="btn_duplicate_week"
              onClick={() => {
                setNewTitle(`Grade Cópia de ${activeWeek?.title || 'Semana'}`);
                setNewDateRange(activeWeek?.dateRange || '');
                setShowDuplicateModal(true);
              }}
              title="Duplicar esta semana para criar a próxima"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-xs"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden lg:inline">Duplicar Semana</span>
            </button>

            {/* Layout Selector Button */}
            <button
              id="btn_open_layout_modal"
              onClick={onOpenLayoutModal}
              title="Personalizar Layout Visual da Grade"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition shadow-2xs"
            >
              <Palette className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Layout: {layoutThemeNames[layoutTheme] || 'Personalizado'}</span>
              <span className="sm:hidden">Layout</span>
            </button>

            {/* Generate Timetable Button */}
            <button
              id="btn_open_solver"
              onClick={onOpenSolver || (() => setShowSolverModal(true))}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Gerar Grade</span>
            </button>

            {/* Export Button */}
            <button
              id="btn_open_export"
              onClick={onOpenExport || (() => setShowExportModal(true))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Exportar</span>
            </button>

            {/* Conflict Counter Button */}
            <button
              id="btn_toggle_conflicts"
              onClick={onOpenConflicts}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition ${
                validation.totalErrors > 0
                  ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                  : validation.totalWarnings > 0
                  ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              {validation.totalErrors > 0 ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                  <span>{validation.totalErrors} Erro(s)</span>
                </>
              ) : validation.totalWarnings > 0 ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>{validation.totalWarnings} Aviso(s)</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>100% Viável</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer / Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-2 border-t border-slate-200 grid grid-cols-2 gap-1 animate-in fade-in">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-left transition ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Desktop / Tablet Navigation Tabs */}
        <nav className="hidden md:flex space-x-1 sm:space-x-2 overflow-x-auto scrollbar-none border-t border-slate-100 py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab_${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Solver Modal */}
      {showSolverModal && (
        <SolverModal onClose={() => setShowSolverModal(false)} />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal onClose={() => setShowExportModal(false)} />
      )}

      {/* Duplicate Week Granular Modal */}
      {showDuplicateModal && activeWeek && (
        <DuplicateWeekModal
          sourceWeek={activeWeek}
          onClose={() => setShowDuplicateModal(false)}
        />
      )}
    </header>
  );
};
