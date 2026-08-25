import React, { useState } from 'react';
import {
  Copy,
  CheckSquare,
  Square,
  X,
  Sparkles,
  Calendar,
  Layers,
  Users,
  GraduationCap,
  BookOpen,
  Clock,
  Scale,
  DoorClosed,
  Lock,
} from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';
import { WeekSchedule, DuplicateWeekOptions } from '../types';

interface DuplicateWeekModalProps {
  sourceWeek: WeekSchedule;
  onClose: () => void;
}

export const DuplicateWeekModal: React.FC<DuplicateWeekModalProps> = ({
  sourceWeek,
  onClose,
}) => {
  const { duplicateWeekWithOptions } = useSchedule();

  const [newTitle, setNewTitle] = useState(`Cópia de ${sourceWeek.title}`);
  const [newDateRange, setNewDateRange] = useState(sourceWeek.dateRange || 'Próxima Semana');

  const [options, setOptions] = useState<DuplicateWeekOptions>({
    copyGrid: true,
    copyLocks: true,
    copyClasses: true,
    copyTeachers: true,
    copySubjects: true,
    copyLoads: true,
    copyTimeSlots: true,
    copyRules: true,
    copySharedRooms: true,
  });

  const toggleOption = (key: keyof DuplicateWeekOptions) => {
    setOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleApplyPreset = (preset: 'all' | 'structure_only' | 'base_only') => {
    if (preset === 'all') {
      setOptions({
        copyGrid: true,
        copyLocks: true,
        copyClasses: true,
        copyTeachers: true,
        copySubjects: true,
        copyLoads: true,
        copyTimeSlots: true,
        copyRules: true,
        copySharedRooms: true,
      });
    } else if (preset === 'structure_only') {
      // Keep everything EXCEPT the actual allocated grid lessons
      setOptions({
        copyGrid: false,
        copyLocks: false,
        copyClasses: true,
        copyTeachers: true,
        copySubjects: true,
        copyLoads: true,
        copyTimeSlots: true,
        copyRules: true,
        copySharedRooms: true,
      });
    } else if (preset === 'base_only') {
      // Just classes, teachers and subjects
      setOptions({
        copyGrid: false,
        copyLocks: false,
        copyClasses: true,
        copyTeachers: true,
        copySubjects: true,
        copyLoads: false,
        copyTimeSlots: true,
        copyRules: false,
        copySharedRooms: false,
      });
    }
  };

  const handleDuplicate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    duplicateWeekWithOptions(
      sourceWeek.id,
      newTitle.trim(),
      newDateRange.trim() || 'Próxima Semana',
      options
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Duplicação Granular de Semana
              </h3>
              <p className="text-xs text-slate-500">
                Origem: <span className="font-semibold text-slate-700">{sourceWeek.title}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleDuplicate} className="space-y-4 my-4">
          
          {/* Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Título da Nova Semana *
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Semana 36 — 05/09/2026"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Período / Datas
              </label>
              <input
                type="text"
                value={newDateRange}
                onChange={(e) => setNewDateRange(e.target.value)}
                placeholder="Ex: 05/09 a 11/09/2026"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700">Atalhos de Cópia:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyPreset('all')}
                className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg shadow-2xs transition"
              >
                🌟 Clonar Tudo
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('structure_only')}
                className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded-lg shadow-2xs transition"
                title="Copia regras, turmas e professores, mas limpa a grade para gerar do zero"
              >
                🧹 Limpar Grade (Manter Estrutura)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('base_only')}
                className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg shadow-2xs transition"
              >
                🎯 Apenas Cadastros Base
              </button>
            </div>
          </div>

          {/* Granular Checkboxes */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Selecione o que deseja copiar para a nova semana:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              
              {/* 1. Grid */}
              <button
                type="button"
                onClick={() => toggleOption('copyGrid')}
                className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                  options.copyGrid
                    ? 'bg-indigo-50/70 border-indigo-400 text-indigo-950 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>Aulas Alocadas na Grade</span>
                </div>
                {options.copyGrid ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
              </button>

              {/* 2. Locks */}
              <button
                type="button"
                onClick={() => toggleOption('copyLocks')}
                className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                  options.copyLocks
                    ? 'bg-indigo-50/70 border-indigo-400 text-indigo-950 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>Fixações e Travas de Células</span>
                </div>
                {options.copyLocks ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
              </button>

              {/* 3. Classes */}
              <button
                type="button"
                onClick={() => toggleOption('copyClasses')}
                className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                  options.copyClasses
                    ? 'bg-indigo-50/70 border-indigo-400 text-indigo-950 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Turmas e Agrupamentos ({sourceWeek.classes.length})</span>
                </div>
                {options.copyClasses ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
              </button>

              {/* 4. Teachers */}
              <button
                type="button"
                onClick={() => toggleOption('copyTeachers')}
                className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                  options.copyTeachers
                    ? 'bg-indigo-50/70 border-indigo-400 text-indigo-950 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  <span>Professores & Ausências ({sourceWeek.teachers.length})</span>
                </div>
                {options.copyTeachers ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
              </button>

              {/* 5. Subjects */}
              <button
                type="button"
                onClick={() => toggleOption('copySubjects')}
                className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                  options.copySubjects
                    ? 'bg-indigo-50/70 border-indigo-400 text-indigo-950 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>Disciplinas ({sourceWeek.subjects.length})</span>
                </div>
                {options.copySubjects ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
              </button>

              {/* 6. Loads */}
              <button
                type="button"
                onClick={() => toggleOption('copyLoads')}
                className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                  options.copyLoads
                    ? 'bg-indigo-50/70 border-indigo-400 text-indigo-950 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Carga Horária Semanal ({sourceWeek.loads.length})</span>
                </div>
                {options.copyLoads ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
              </button>

              {/* 7. Time Slots */}
              <button
                type="button"
                onClick={() => toggleOption('copyTimeSlots')}
                className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                  options.copyTimeSlots
                    ? 'bg-indigo-50/70 border-indigo-400 text-indigo-950 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Tempos, Turnos & Intervalos</span>
                </div>
                {options.copyTimeSlots ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
              </button>

              {/* 8. Rules */}
              <button
                type="button"
                onClick={() => toggleOption('copyRules')}
                className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                  options.copyRules
                    ? 'bg-indigo-50/70 border-indigo-400 text-indigo-950 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-indigo-600" />
                  <span>Regras & Restrições ({sourceWeek.rules.length})</span>
                </div>
                {options.copyRules ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
              </button>

              {/* 9. Shared Rooms */}
              <button
                type="button"
                onClick={() => toggleOption('copySharedRooms')}
                className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between sm:col-span-2 ${
                  options.copySharedRooms
                    ? 'bg-indigo-50/70 border-indigo-400 text-indigo-950 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <DoorClosed className="w-4 h-4 text-indigo-600" />
                  <span>Salas & Laboratórios Compartilhados ({sourceWeek.sharedRooms.length})</span>
                </div>
                {options.copySharedRooms ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
            >
              <Copy className="w-3.5 h-3.5" />
              Criar Semana Duplicada
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
