import React, { useState } from 'react';
import {
  Calendar,
  Copy,
  Plus,
  Trash2,
  Edit2,
  Pencil,
  FolderOpen,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  FileCode,
  Compass,
  Building2,
  X,
} from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';
import { GridCell, WeekSchedule } from '../types';
import { exportBackupJSON } from '../utils/exportEngine';
import { DuplicateWeekModal } from './DuplicateWeekModal';
import { WelcomeOnboardingModal } from './WelcomeOnboardingModal';

export const WeeksList: React.FC = () => {
  const {
    weeks,
    activeWeekId,
    setActiveWeekId,
    setActiveTab,
    createNewWeek,
    updateWeek,
    deleteWeek,
    importData,
  } = useSchedule();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [weekToDuplicate, setWeekToDuplicate] = useState<WeekSchedule | null>(null);

  // Edit Week State
  const [weekToEdit, setWeekToEdit] = useState<WeekSchedule | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDateRange, setEditDateRange] = useState('');
  const [editInstitutionName, setEditInstitutionName] = useState('');

  const [newTitle, setNewTitle] = useState('');
  const [newDateRange, setNewDateRange] = useState('');
  const [creationMode, setCreationMode] = useState<'placeholder' | 'empty'>('placeholder');

  const handleOpenDuplicateModal = (weekId: string) => {
    const source = weeks.find((w) => w.id === weekId);
    if (!source) return;
    setWeekToDuplicate(source);
  };

  const handleStartEdit = (week: WeekSchedule) => {
    setWeekToEdit(week);
    setEditTitle(week.title);
    setEditDateRange(week.dateRange);
    setEditInstitutionName(week.institutionName || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weekToEdit || !editTitle.trim()) return;

    updateWeek(weekToEdit.id, {
      title: editTitle.trim(),
      dateRange: editDateRange.trim() || 'Semana Regular',
      institutionName: editInstitutionName.trim() || undefined,
    });

    setWeekToEdit(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createNewWeek(newTitle, newDateRange || 'Próxima Semana', creationMode);
    setNewTitle('');
    setNewDateRange('');
    setCreationMode('placeholder');
    setShowCreateModal(false);
  };

  const handleOpenWeek = (weekId: string) => {
    setActiveWeekId(weekId);
    setActiveTab('grade');
  };

  const [importStatusMessage, setImportStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const res = importData(content);
        if (res.isValid) {
          setImportStatusMessage({
            type: 'success',
            text: `Backup importado com sucesso! ${res.count || 1} grade(s) semanal(is) carregada(s).`,
          });
          setTimeout(() => setImportStatusMessage(null), 5000);
        } else {
          setImportStatusMessage({
            type: 'error',
            text: res.error || 'O arquivo selecionado não é um backup válido do Gerador de Grade.',
          });
        }
      } catch (err: any) {
        setImportStatusMessage({
          type: 'error',
          text: `Erro ao processar arquivo: ${err?.message || 'Arquivo corrompido'}.`,
        });
      }
    };
    reader.readAsText(file);
    // Reset file input value so same file can be selected again if needed
    e.target.value = '';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {importStatusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center justify-between border ${
            importStatusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{importStatusMessage.text}</span>
          <button
            onClick={() => setImportStatusMessage(null)}
            className="text-xs underline ml-4 hover:opacity-80 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}
      
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <FolderOpen className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Histórico & Gerenciador de Semanas
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Duplicar a semana anterior é o fluxo padrão recomendado: você mantém todas as regras e cargas configuradas e apenas ajusta o que mudou.
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => setShowWelcomeModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition shadow-2xs cursor-pointer"
            title="Escolha entre começar com exemplo, grade vazia ou importar backup"
          >
            <Compass className="w-3.5 h-3.5 text-indigo-600" />
            Como Começar / Modelos
          </button>

          <button
            onClick={() => exportBackupJSON(weeks)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            Exportar Backup JSON
          </button>

          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition shadow-xs cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            Restaurar Backup JSON
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>

          <button
            id="btn_create_new_week"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nova Semana
          </button>
        </div>
      </div>

      {/* Weeks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {weeks.map((week) => {
          const isActive = week.id === activeWeekId;
          const totalCellsWithSubject = (Object.values(week.grid || {}) as GridCell[]).filter(
            (c) => c?.subjectId
          ).length;

          return (
            <div
              key={week.id}
              className={`p-5 rounded-2xl border transition relative flex flex-col justify-between space-y-4 ${
                isActive
                  ? 'bg-indigo-50/40 border-indigo-300 ring-2 ring-indigo-500 shadow-sm'
                  : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{week.title}</span>
                      {isActive && (
                        <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Em Edição
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <span>Período: {week.dateRange}</span>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(week)}
                        className="inline-flex items-center gap-0.5 text-indigo-600 hover:text-indigo-800 hover:underline text-[11px] font-semibold ml-1 cursor-pointer"
                        title="Editar título e período desta semana"
                      >
                        <Pencil className="w-3 h-3" />
                        Editar
                      </button>
                    </div>
                    {week.institutionName && (
                      <div className="text-[11px] text-slate-400">
                        {week.institutionName}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartEdit(week)}
                    className="p-2 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 shadow-2xs transition cursor-pointer"
                    title="Editar informações da semana"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-200/60 text-xs">
                  <div className="bg-white/80 p-2 rounded-lg border border-slate-200/80">
                    <div className="text-slate-400 text-[10px]">Turmas</div>
                    <div className="font-bold text-slate-800">{week.classes.length}</div>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-slate-200/80">
                    <div className="text-slate-400 text-[10px]">Professores</div>
                    <div className="font-bold text-slate-800">{week.teachers.length}</div>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-slate-200/80">
                    <div className="text-slate-400 text-[10px]">Aulas Alocadas</div>
                    <div className="font-bold text-slate-800">{totalCellsWithSubject}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleStartEdit(week)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition cursor-pointer"
                    title="Editar título e período"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-500" />
                    <span>Editar</span>
                  </button>

                  <button
                    onClick={() => handleOpenDuplicateModal(week.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition cursor-pointer"
                    title="Duplicar esta semana escolhendo o que copiar"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Duplicar...</span>
                  </button>

                  {weeks.length > 1 && (
                    <button
                      onClick={() => deleteWeek(week.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Excluir semana"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => handleOpenWeek(week.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition cursor-pointer"
                >
                  <span>Abrir Grade</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Duplicate Granular Modal */}
      {weekToDuplicate && (
        <DuplicateWeekModal
          sourceWeek={weekToDuplicate}
          onClose={() => setWeekToDuplicate(null)}
        />
      )}

      {/* Welcome / Onboarding Modal */}
      {showWelcomeModal && (
        <WelcomeOnboardingModal
          onClose={() => setShowWelcomeModal(false)}
        />
      )}

      {/* Create Week Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Cadastrar Nova Grade Semanal
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Escolha o título, período e o modelo inicial da semana.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Título da Grade *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  placeholder="Ex: Grade 29/08/26 — Semana 35"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Período
                </label>
                <input
                  type="text"
                  value={newDateRange}
                  onChange={(e) => setNewDateRange(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  placeholder="Ex: 29/08/2026 a 04/09/2026"
                />
              </div>

              {/* Mode Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Tipo de Conteúdo Inicial
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreationMode('placeholder')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      creationMode === 'placeholder'
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-950">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Placeholder
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      10 matérias comuns, turmas e professores de exemplo.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreationMode('empty')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      creationMode === 'empty'
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                      <FileCode className="w-3.5 h-3.5 text-slate-600" />
                      100% Vazia
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Semana limpa do zero para você cadastrar tudo.
                    </p>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Criar & Abrir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Week Modal */}
      {weekToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                Editar Informações da Semana
              </h3>
              <button
                type="button"
                onClick={() => setWeekToEdit(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Atualize o título e o período/datas desta semana para manter o histórico e relatórios organizados.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título da Grade / Semana *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  placeholder="Ex: Semana 35 — Intensivo Reta Final"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Período / Datas
                </label>
                <input
                  type="text"
                  value={editDateRange}
                  onChange={(e) => setEditDateRange(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  placeholder="Ex: 29/08/2026 a 04/09/2026"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome da Escola / Curso / Projeto (Opcional)
                </label>
                <input
                  type="text"
                  value={editInstitutionName}
                  onChange={(e) => setEditInstitutionName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  placeholder="Ex: Escola Estadual Modelo / Curso Preparatório"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWeekToEdit(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
