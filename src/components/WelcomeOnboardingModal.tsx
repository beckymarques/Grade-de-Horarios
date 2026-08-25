import React, { useRef } from 'react';
import {
  Sparkles,
  FileCode,
  Upload,
  Calendar,
  X,
  Building2,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';

interface WelcomeOnboardingModalProps {
  onClose: () => void;
  isFirstTime?: boolean;
}

export const WelcomeOnboardingModal: React.FC<WelcomeOnboardingModalProps> = ({
  onClose,
  isFirstTime = false,
}) => {
  const { resetToSampleSchool, resetToEmptySchool, importData } = useSchedule();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectSample = () => {
    resetToSampleSchool();
    localStorage.setItem('prevest_has_onboarded_v1', 'true');
    onClose();
  };

  const handleSelectEmpty = () => {
    resetToEmptySchool();
    localStorage.setItem('prevest_has_onboarded_v1', 'true');
    onClose();
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
          localStorage.setItem('prevest_has_onboarded_v1', 'true');
          onClose();
        } else {
          alert('Arquivo JSON inválido. Verifique o formato do backup.');
        }
      } catch (err) {
        alert('Erro ao processar o arquivo de backup.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Subtle decorative background accent */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-100 rounded-full blur-2xl pointer-events-none opacity-60" />

        {/* Top Header */}
        <div className="flex items-start justify-between relative z-10 pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold tracking-wide uppercase mb-2">
              <Calendar className="w-3.5 h-3.5" />
              Gerador de Grade Semanal
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Bem-vindo ao Gerador de Grade
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Como você deseja começar a planejar os horários?
            </p>
          </div>

          {!isFirstTime && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 3 Main Choice Cards */}
        <div className="space-y-3.5 my-6 relative z-10">
          
          {/* 1. START WITH EXAMPLE */}
          <button
            type="button"
            onClick={handleSelectSample}
            className="w-full text-left p-4 sm:p-5 rounded-2xl border-2 border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 transition shadow-xs hover:shadow-md flex items-start gap-4 group cursor-pointer"
          >
            <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-xs group-hover:scale-105 transition shrink-0">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                  ✨ Começar com Exemplo
                  <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full">
                    Recomendado
                  </span>
                </h3>
                <ArrowRight className="w-4 h-4 text-indigo-600 group-hover:translate-x-1 transition" />
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Carrega uma escola fictícia com turmas, matérias, professores e regras para testar todas as funcionalidades do solver e da grade.
              </p>
            </div>
          </button>

          {/* 2. START EMPTY */}
          <button
            type="button"
            onClick={handleSelectEmpty}
            className="w-full text-left p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition shadow-xs hover:shadow-md flex items-start gap-4 group cursor-pointer"
          >
            <div className="p-3 bg-slate-100 text-slate-700 rounded-xl group-hover:scale-105 transition shrink-0 border border-slate-200">
              <FileCode className="w-6 h-6 text-slate-700" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  📁 Começar do Zero (Vazia)
                </h3>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Uma grade totalmente limpa pronta para você cadastrar os dados reais da sua instituição do seu jeito.
              </p>
            </div>
          </button>

          {/* 3. IMPORT BACKUP */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full text-left p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition shadow-xs hover:shadow-md flex items-start gap-4 group cursor-pointer"
          >
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl group-hover:scale-105 transition shrink-0 border border-emerald-200">
              <Upload className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  📦 Importar Backup
                </h3>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Restaura seus dados salvos de um arquivo JSON (.json) exportado anteriormente.
              </p>
            </div>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileImport}
            className="hidden"
          />
        </div>

        {/* Footer Note */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Seus dados ficam salvos localmente e podem ser exportados a qualquer momento.
          </span>
          {!isFirstTime && (
            <button
              onClick={onClose}
              className="text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
