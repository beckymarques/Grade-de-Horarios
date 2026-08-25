import React, { useState } from 'react';
import {
  X,
  Lock,
  Unlock,
  Trash2,
  AlertTriangle,
  Check,
  User,
  BookOpen,
} from 'lucide-react';
import { DayOfWeek, DAYS_OF_WEEK } from '../types';
import { useSchedule } from '../context/ScheduleContext';

interface CellEditModalProps {
  day: DayOfWeek;
  slotId: string;
  classId: string;
  onClose: () => void;
}

export const CellEditModal: React.FC<CellEditModalProps> = ({
  day,
  slotId,
  classId,
  onClose,
}) => {
  const {
    activeWeek,
    updateCell,
    clearCell,
    validation,
  } = useSchedule();

  if (!activeWeek) return null;

  const key = `${day}_${slotId}_${classId}`;
  const cell = activeWeek.grid[key];
  const slot = activeWeek.generatedSlots.find((s) => s.id === slotId);
  const currentClass = activeWeek.classes.find((c) => c.id === classId);
  const dayMeta = DAYS_OF_WEEK.find((d) => d.key === day);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(cell?.subjectId || null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(cell?.teacherId || null);
  const [isLocked, setIsLocked] = useState<boolean>(cell?.isLocked || false);

  // Filter teachers capable of teaching selected subject
  const capableTeachers = activeWeek.teachers.filter(
    (t) => selectedSubjectId && t.subjectIds.includes(selectedSubjectId)
  );

  const handleSubjectChange = (newSubId: string) => {
    setSelectedSubjectId(newSubId || null);
    if (!newSubId) {
      setSelectedTeacherId(null);
      return;
    }
    // Auto-select preferred or capable teacher
    const load = activeWeek.loads.find((l) => l.classId === classId && l.subjectId === newSubId);
    if (load?.preferredTeacherId) {
      setSelectedTeacherId(load.preferredTeacherId);
    } else {
      const capable = activeWeek.teachers.filter((t) => t.subjectIds.includes(newSubId));
      if (capable.length > 0) {
        setSelectedTeacherId(capable[0].id);
      }
    }
  };

  const handleSave = () => {
    updateCell(day, slotId, classId, selectedSubjectId, selectedTeacherId, isLocked);
    onClose();
  };

  const handleClear = () => {
    clearCell(day, slotId, classId);
    onClose();
  };

  // Find any conflicts active on this cell
  const cellConflicts = validation.conflicts.filter(
    (c) => c.day === day && c.slotId === slotId && c.classId === classId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-md">
                {dayMeta?.label || day}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {slot?.name} ({slot?.startTime} - {slot?.endTime})
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Editar Horário: {currentClass?.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Conflict Alerts */}
        {cellConflicts.length > 0 && (
          <div className="my-3 space-y-1.5">
            {cellConflicts.map((c) => (
              <div
                key={c.id}
                className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                  c.severity === 'error'
                    ? 'bg-rose-50 border border-rose-200 text-rose-800'
                    : 'bg-amber-50 border border-amber-200 text-amber-800'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">{c.ruleName}: </span>
                  <span>{c.message}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form Body */}
        <div className="space-y-4 my-4">
          
          {/* Lock / Pin Status Banner */}
          <div className={`p-3 rounded-xl border flex items-center justify-between transition ${
            isLocked
              ? 'bg-amber-50/80 border-amber-300 text-amber-900'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${isLocked ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-200 text-slate-600'}`}>
                {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-bold">
                  {isLocked ? 'Célula Fixada / Travada' : 'Célula Livre'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {isLocked
                    ? 'Esta célula está protegida contra alterações automáticas e manuais. Destrave para modificar.'
                    : 'O gerador automático e o usuário podem alterar e otimizar esta aula.'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsLocked(!isLocked)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition shadow-2xs ${
                isLocked
                  ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {isLocked ? '🔓 Destravar' : '🔒 Travar'}
            </button>
          </div>

          {/* Subject selector */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              Disciplina
            </label>
            <select
              value={selectedSubjectId || ''}
              onChange={(e) => handleSubjectChange(e.target.value)}
              disabled={isLocked}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              <option value="">-- Célula Vazia / Sem Aula --</option>
              {activeWeek.subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} {sub.isHeavy ? '(Pesada)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Teacher selector */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              Professor Responsável
            </label>
            <select
              value={selectedTeacherId || ''}
              onChange={(e) => setSelectedTeacherId(e.target.value || null)}
              disabled={!selectedSubjectId || isLocked}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              <option value="">-- Selecione o Professor --</option>
              {capableTeachers.map((t) => {
                // Check if teacher has absence or is booked elsewhere
                const isAbsent = t.absences.some((a) => a.day === day && (a.allDay || (a.slotIds && a.slotIds.includes(slotId))));
                return (
                  <option key={t.id} value={t.id}>
                    {t.name} {isAbsent ? '⚠️ (Ausência registrada)' : ''}
                  </option>
                );
              })}
              {/* Fallback to list other teachers */}
              {activeWeek.teachers
                .filter((t) => !capableTeachers.some((c) => c.id === t.id))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (Outra especialidade)
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-6">
          <button
            type="button"
            onClick={handleClear}
            disabled={isLocked}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar Horário
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition"
            >
              <Check className="w-3.5 h-3.5" />
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
