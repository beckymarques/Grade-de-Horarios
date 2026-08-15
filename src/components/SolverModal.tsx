import React, { useState } from 'react';
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  ArrowRight,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useSchedule } from '../context/ScheduleContext';
import { GridCell } from '../types';
import { SolverResult } from '../utils/solver';

interface SolverModalProps {
  onClose: () => void;
}

export const SolverModal: React.FC<SolverModalProps> = ({ onClose }) => {
  const {
    activeWeek,
    generateGrid,
    lastSolverResult,
    setActiveTab,
  } = useSchedule();

  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<SolverResult | null>(lastSolverResult);

  if (!activeWeek) return null;

  const lockedCount = (Object.values(activeWeek.grid || {}) as GridCell[]).filter(
    (c) => c?.isLocked && c.subjectId
  ).length;

  const handleRunSolver = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const solverRes = generateGrid();
      setResult(solverRes);
      setIsGenerating(false);

      if (solverRes.success) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }, 400);
  };

  const handleGoToGrid = () => {
    setActiveTab('grade');
    onClose();
  };

  const handleGoToRules = () => {
    setActiveTab('regras');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Gerador Inteligente de Grade Semanal
              </h3>
              <p className="text-xs text-slate-500">
                Otimização com restrições exatas e detecção de viabilidade
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          
          {/* Rules Summary */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="text-slate-400 text-[11px]">Regras Obrigatórias</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5">
                {activeWeek.rules.filter((r) => r.isEnabled && r.isMandatory).length} Ativas
              </div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="text-slate-400 text-[11px]">Preferências Suaves</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5">
                {activeWeek.rules.filter((r) => r.isEnabled && !r.isMandatory).length} Ativas
              </div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="text-slate-400 text-[11px]">Células Travadas 🔒</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5">
                {lockedCount} Fixadas
              </div>
            </div>
          </div>

          {/* Solver Result Feedback */}
          {result && (
            <div className="space-y-3">
              {result.success ? (
                /* Success State */
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold">Grade Viável Gerada com Sucesso!</h4>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      Todas as <strong>{result.totalTargetCount} aulas</strong> foram alocadas respeitando 100% das regras obrigatórias e maximizando o aproveitamento dos professores em apenas <strong>{result.durationMs}ms</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                /* Impossible / Diagnostic State */
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-950 space-y-3">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold">Inviabilidade Encontrada nas Regras</h4>
                      <p className="text-xs text-rose-900 mt-0.5">
                        O gerador identificou restrições conflitantes que impedem o cumprimento de 100% da carga horária sem quebrar regras obrigatórias.
                      </p>
                    </div>
                  </div>

                  {/* Specific Diagnostic Bottlenecks */}
                  {result.diagnostics.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-xs font-bold uppercase tracking-wider text-rose-800">
                        Diagnóstico Detalhado do Gargalo:
                      </div>
                      {result.diagnostics.map((diag, i) => (
                        <div
                          key={i}
                          className="p-2.5 bg-white/80 border border-rose-200 rounded-xl text-xs font-medium text-rose-950"
                        >
                          • {diag}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggested Relaxations */}
                  {result.suggestedRelaxations.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-rose-200">
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                        Sugestões de Ajuste / Flexibilização:
                      </div>
                      <div className="space-y-1">
                        {result.suggestedRelaxations.map((sug, i) => (
                          <div
                            key={i}
                            className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900"
                          >
                            💡 {sug}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2 shrink-0">
          <button
            type="button"
            onClick={handleGoToRules}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Ajustar Regras</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Fechar
            </button>
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleRunSolver}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{isGenerating ? 'Calculando Grade...' : 'Executar Algoritmo'}</span>
            </button>
            {result?.success && (
              <button
                type="button"
                onClick={handleGoToGrid}
                className="inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition"
              >
                <span>Ver Grade</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
