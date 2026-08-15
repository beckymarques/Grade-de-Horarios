import React, { useState } from 'react';
import {
  Calendar,
  Copy,
  Plus,
  Trash2,
  Edit2,
  FolderOpen,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';
import { GridCell } from '../types';
import { exportBackupJSON } from '../utils/exportEngine';

export const WeeksList: React.FC = () => {
  const {
    weeks,
    activeWeekId,
    setActiveWeekId,
    setActiveTab,
    duplicateWeek,
    createNewWeek,
    deleteWeek,
    importData,
    resetAllToDefaults,
  } = useSchedule();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDateRange, setNewDateRange] = useState('');

  const handleDuplicate = (weekId: string) => {
    const source = weeks.find((w) => w.id === weekId);
    if (!source) return;
    const duplicated = duplicateWeek(
      source.id,
      `Grade Cópia de ${source.title}`,
      source.dateRange
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createNewWeek(newTitle, newDateRange || 'Próxima Semana');
    setNewTitle('');
    setNewDateRange('');
    setShowCreateModal(false);
  };

  const handleOpenWeek = (weekId: string) => {
    setActiveWeekId(weekId);
    setActiveTab('grade');
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          importData(parsed);
          alert('Backup importado com sucesso!');
        } else {
          alert('Arquivo JSON inválido.');
        }
      } catch (err) {
        alert('Erro ao ler arquivo de backup.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
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
            onClick={() => exportBackupJSON(weeks)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition shadow-xs"
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
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Nova Semana do Zero
          </button>
        </div>
      </div>

      {/* Weeks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {weeks.map((week) => {
          const isActive = week.id === activeWeekId;
          const lessonSlots = week.generatedSlots.filter((s) => s.type === 'lesson');
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
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{week.title}</span>
                      {isActive && (
                        <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Em Edição
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                      Período: {week.dateRange}
                    </div>
                  </div>

                  <div className="p-2 bg-white rounded-xl border border-slate-200 text-indigo-600">
                    <Calendar className="w-5 h-5" />
                  </div>
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDuplicate(week.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition"
                    title="Duplicar esta semana para criar a próxima"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Duplicar</span>
                  </button>

                  {weeks.length > 1 && (
                    <button
                      onClick={() => deleteWeek(week.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Excluir semana"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => handleOpenWeek(week.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition"
                >
                  <span>Abrir Grade</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Week Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Cadastrar Nova Grade Semanal
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Dica: Se você já tem uma semana anterior, prefira usar o botão "Duplicar" para não precisar recadastrar turmas e professores.
            </p>
            <form onSubmit={handleCreate} className="space-y-3">
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

              <div className="flex justify-end gap-2 mt-6">
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
    </div>
  );
};
