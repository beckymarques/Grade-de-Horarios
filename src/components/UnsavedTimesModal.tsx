import React from 'react';
import { AlertTriangle, Save, Trash2, ArrowLeft } from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';

export const UnsavedTimesModal: React.FC = () => {
  const { pendingTabChange, confirmTabChange } = useSchedule();

  if (!pendingTabChange) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
        {/* Header with warning badge */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Alterações Não Salvas
            </h3>
            <p className="text-xs text-slate-500">
              Você modificou as configurações de Tempos do Dia
            </p>
          </div>
        </div>

        {/* Message */}
        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          Você possui ajustes de horários, intervalos ou refeições que ainda não foram aplicados na grade semanal. O que deseja fazer antes de navegar para outra tela?
        </p>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          {/* Primary: Save and Apply */}
          <button
            type="button"
            onClick={() => confirmTabChange('save')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition active:scale-98 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Salvar e Aplicar na Grade</span>
          </button>

          {/* Secondary: Discard */}
          <button
            type="button"
            onClick={() => confirmTabChange('discard')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition active:scale-98 cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Descartar Alterações e Sair</span>
          </button>

          {/* Tertiary: Cancel / Stay */}
          <button
            type="button"
            onClick={() => confirmTabChange('cancel')}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Continuar Editando Tempos</span>
          </button>
        </div>
      </div>
    </div>
  );
};
