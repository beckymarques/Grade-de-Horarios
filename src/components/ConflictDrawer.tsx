import React from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';
import { DayOfWeek, DAYS_OF_WEEK } from '../types';

interface ConflictDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCell?: (day: DayOfWeek, slotId: string, classId: string) => void;
}

export const ConflictDrawer: React.FC<ConflictDrawerProps> = ({
  isOpen,
  onClose,
  onSelectCell,
}) => {
  const { validation, activeWeek, setSelectedDay } = useSchedule();

  if (!isOpen) return null;

  const errors = validation.conflicts.filter((c) => c.severity === 'error');
  const warnings = validation.conflicts.filter((c) => c.severity === 'warning');

  const handleJumpToCell = (conflict: any) => {
    if (conflict.day) {
      setSelectedDay(conflict.day);
    }
    if (onSelectCell && conflict.slotId && conflict.classId) {
      onSelectCell(conflict.day, conflict.slotId, conflict.classId);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${errors.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Painel de Validação & Conflitos
              </h2>
              <p className="text-xs text-slate-500">
                Verificação em tempo real da grade semanal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conflict Summary Counters */}
        <div className="grid grid-cols-2 gap-2 p-4 bg-white border-b border-slate-100">
          <div className={`p-3 rounded-xl border ${errors.length > 0 ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
            <div className="text-xl font-bold">{errors.length}</div>
            <div className="text-xs font-medium">Erros Obrigatórios</div>
          </div>
          <div className={`p-3 rounded-xl border ${warnings.length > 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
            <div className="text-xl font-bold">{warnings.length}</div>
            <div className="text-xs font-medium">Avisos / Preferências</div>
          </div>
        </div>

        {/* Conflict List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {validation.conflicts.length === 0 ? (
            <div className="text-center py-12 px-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800">Grade 100% Válida!</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Nenhum conflito de horário, ausência ou violação de regras foi detectado nesta grade.
              </p>
            </div>
          ) : (
            <>
              {/* Errors section */}
              {errors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Erros Críticos (Impossibilitam a Grade)
                  </div>
                  {errors.map((conflict) => {
                    const dayLabel = DAYS_OF_WEEK.find((d) => d.key === conflict.day)?.short || conflict.day;
                    const slotName = activeWeek?.generatedSlots.find((s) => s.id === conflict.slotId)?.name || conflict.slotId;
                    const className = activeWeek?.classes.find((c) => c.id === conflict.classId)?.name;

                    return (
                      <div
                        key={conflict.id}
                        onClick={() => handleJumpToCell(conflict)}
                        className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl hover:bg-rose-100/70 transition cursor-pointer group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-rose-800">
                            {conflict.ruleName}
                          </span>
                          <span className="text-[10px] bg-rose-200 text-rose-900 font-semibold px-2 py-0.5 rounded-full shrink-0">
                            {dayLabel} • {slotName}
                          </span>
                        </div>
                        <p className="text-xs text-rose-900 mt-1 leading-relaxed">
                          {conflict.message}
                        </p>
                        {conflict.suggestion && (
                          <div className="mt-2 p-2 bg-rose-100/70 border border-rose-300/50 rounded-lg text-[11px] text-rose-950 font-medium">
                            {conflict.suggestion}
                          </div>
                        )}
                        {className && (
                          <div className="text-[11px] text-rose-700 font-medium mt-1.5 flex items-center gap-1">
                            <span>Turma: {className}</span>
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition shrink-0 ml-auto" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Warnings section */}
              {warnings.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Avisos de Otimização & Preferências
                  </div>
                  {warnings.map((conflict) => {
                    const dayLabel = DAYS_OF_WEEK.find((d) => d.key === conflict.day)?.short || conflict.day;
                    const slotName = activeWeek?.generatedSlots.find((s) => s.id === conflict.slotId)?.name || conflict.slotId;
                    const className = activeWeek?.classes.find((c) => c.id === conflict.classId)?.name;

                    return (
                      <div
                        key={conflict.id}
                        onClick={() => handleJumpToCell(conflict)}
                        className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl hover:bg-amber-100/70 transition cursor-pointer group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-amber-900">
                            {conflict.ruleName}
                          </span>
                          <span className="text-[10px] bg-amber-200 text-amber-900 font-semibold px-2 py-0.5 rounded-full shrink-0">
                            {dayLabel} • {slotName}
                          </span>
                        </div>
                        <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                          {conflict.message}
                        </p>
                        {conflict.suggestion && (
                          <div className="mt-2 p-2 bg-amber-100/70 border border-amber-300/50 rounded-lg text-[11px] text-amber-950 font-medium">
                            {conflict.suggestion}
                          </div>
                        )}
                        {className && (
                          <div className="text-[11px] text-amber-800 font-medium mt-1.5 flex items-center gap-1">
                            <span>Turma: {className}</span>
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition shrink-0 ml-auto" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            Clique em qualquer conflito para navegar até a célula.
          </p>
        </div>
      </div>
    </div>
  );
};
