import React, { useState } from 'react';
import {
  BookOpen,
  Copy,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';

export const ConfigLoads: React.FC = () => {
  const { activeWeek, updateLoad, updateActiveWeek } = useSchedule();

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [sourceClassToCopy, setSourceClassToCopy] = useState<string>('');

  if (!activeWeek) return null;

  const standardClasses = activeWeek.classes.filter((c) => !c.isGrouped);
  const currentClassId = selectedClassId || standardClasses[0]?.id || activeWeek.classes[0]?.id;
  const currentClass = activeWeek.classes.find((c) => c.id === currentClassId);

  const lessonSlotsCount = activeWeek.generatedSlots.filter((s) => s.type === 'lesson').length;
  const totalSlotsInWeek = activeWeek.activeDays.length * lessonSlotsCount;

  // Compute total configured loads for current class
  const classLoads = activeWeek.loads.filter((l) => l.classId === currentClassId);
  const totalClassLoad = classLoads.reduce((sum, l) => sum + (l.lessonsPerWeek || 0), 0);

  const handleCopyLoads = () => {
    if (!sourceClassToCopy || !currentClassId || sourceClassToCopy === currentClassId) return;

    const sourceLoads = activeWeek.loads.filter((l) => l.classId === sourceClassToCopy);
    const otherLoads = activeWeek.loads.filter((l) => l.classId !== currentClassId);

    const clonedLoads = sourceLoads.map((l) => ({
      ...l,
      id: `load_${currentClassId}_${l.subjectId}`,
      classId: currentClassId,
    }));

    updateActiveWeek({
      loads: [...otherLoads, ...clonedLoads],
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Carga Horária Semanal por Turma
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Defina quantas aulas de cada disciplina cada turma deve receber ao longo da semana.
          </p>
        </div>

        {/* Capacity Pill */}
        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 shrink-0">
          <span className="text-xs text-slate-500 font-medium">Capacidade da Turma:</span>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-md ${
              totalClassLoad === totalSlotsInWeek
                ? 'bg-emerald-100 text-emerald-800'
                : totalClassLoad > totalSlotsInWeek
                ? 'bg-rose-100 text-rose-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {totalClassLoad} / {totalSlotsInWeek} tempos
          </span>
        </div>
      </div>

      {/* Class Selector Tabs & Copy Action */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
          {standardClasses.map((cls) => {
            const isSelected = cls.id === currentClassId;
            const cLoads = activeWeek.loads.filter((l) => l.classId === cls.id);
            const sum = cLoads.reduce((acc, cur) => acc + cur.lessonsPerWeek, 0);

            return (
              <button
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{cls.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {sum}h
                </span>
              </button>
            );
          })}
        </div>

        {/* Copy Load Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={sourceClassToCopy}
            onChange={(e) => setSourceClassToCopy(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="">Copiar carga de...</option>
            {standardClasses
              .filter((c) => c.id !== currentClassId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <button
            onClick={handleCopyLoads}
            disabled={!sourceClassToCopy}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg border border-slate-200 transition"
          >
            Copiar
          </button>
        </div>
      </div>

      {/* Subject Loads Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="font-bold text-xs text-slate-800 uppercase tracking-wider">
            Disciplinas & Quantidade de Tempos Semanal ({currentClass?.name})
          </div>
          <div className="text-xs text-slate-500">
            Total alocado: <strong className="text-slate-900">{totalClassLoad} tempos</strong>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {activeWeek.subjects.map((sub) => {
            const load = activeWeek.loads.find(
              (l) => l.classId === currentClassId && l.subjectId === sub.id
            );
            const count = load?.lessonsPerWeek || 0;
            const capableTeachers = activeWeek.teachers.filter((t) =>
              t.subjectIds.includes(sub.id)
            );

            return (
              <div
                key={sub.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition"
              >
                {/* Subject name & badge */}
                <div className="flex items-center gap-3">
                  <span
                    className="w-3 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: sub.color || '#3b82f6' }}
                  />
                  <div>
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                      <span>{sub.name}</span>
                      {sub.isHeavy && (
                        <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded">
                          Pesada
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Professores disponíveis: {capableTeachers.map((t) => t.shortName).join(', ') || 'Nenhum'}
                    </div>
                  </div>
                </div>

                {/* Stepper + Preferred Teacher */}
                <div className="flex items-center gap-4 self-end sm:self-auto">
                  
                  {/* Preferred Teacher selector */}
                  <select
                    value={load?.preferredTeacherId || ''}
                    onChange={(e) =>
                      updateLoad(currentClassId, sub.id, count, e.target.value || undefined)
                    }
                    className="px-2.5 py-1 text-[11px] border border-slate-300 rounded-lg bg-white text-slate-700"
                  >
                    <option value="">Qualquer Professor</option>
                    {capableTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        Pref: {t.name}
                      </option>
                    ))}
                  </select>

                  {/* Quantity Stepper */}
                  <div className="flex items-center bg-slate-100 border border-slate-300 rounded-xl p-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateLoad(
                          currentClassId,
                          sub.id,
                          Math.max(0, count - 1),
                          load?.preferredTeacherId
                        )
                      }
                      className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-white rounded-lg transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-9 text-center font-bold text-xs text-slate-900">
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateLoad(
                          currentClassId,
                          sub.id,
                          count + 1,
                          load?.preferredTeacherId
                        )
                      }
                      className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-white rounded-lg transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
