import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Image,
  Database,
  X,
  Download,
  Loader2,
  Calendar,
  Layers,
  FolderArchive,
  CheckSquare,
  Square,
} from 'lucide-react';
import { DayOfWeek, DAYS_OF_WEEK, WeekSchedule } from '../types';
import { useSchedule } from '../context/ScheduleContext';
import {
  exportScheduleToExcel,
  exportScheduleToPDF,
  exportScheduleToPNG,
  exportBackupJSON,
  ExportFilterOptions,
} from '../utils/exportEngine';

interface ExportModalProps {
  isOpen?: boolean;
  onClose: () => void;
  activeWeek?: WeekSchedule;
  allWeeks?: WeekSchedule[];
}

type ExportScope = 'all_together' | 'single_day' | 'custom_days' | 'separate_zip';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen = true,
  onClose,
  activeWeek: propActiveWeek,
  allWeeks: propAllWeeks,
}) => {
  const { activeWeek: contextActiveWeek, weeks: contextWeeks } = useSchedule();
  const currentActiveWeek = propActiveWeek || contextActiveWeek;
  const currentAllWeeks = propAllWeeks || contextWeeks;

  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [exportScope, setExportScope] = useState<ExportScope>('all_together');
  const [singleDay, setSingleDay] = useState<DayOfWeek>(() => {
    return currentActiveWeek?.activeDays?.[0] || 'SEG';
  });
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(() => {
    return currentActiveWeek?.activeDays || ['SEG', 'TER', 'QUA', 'QUI', 'SEX'];
  });

  // Sync days when active week changes
  useEffect(() => {
    if (currentActiveWeek?.activeDays && currentActiveWeek.activeDays.length > 0) {
      setSelectedDays(currentActiveWeek.activeDays);
      if (!currentActiveWeek.activeDays.includes(singleDay)) {
        setSingleDay(currentActiveWeek.activeDays[0]);
      }
    }
  }, [currentActiveWeek]);

  if (!isOpen || !currentActiveWeek) return null;

  const availableDays = currentActiveWeek.activeDays || [];

  const toggleDay = (day: DayOfWeek) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const selectAllDays = () => {
    setSelectedDays(availableDays);
  };

  const getEffectiveOptions = (): ExportFilterOptions => {
    if (exportScope === 'all_together') {
      return { selectedDays: availableDays, separateZip: false };
    }
    if (exportScope === 'single_day') {
      return { selectedDays: [singleDay], separateZip: false };
    }
    if (exportScope === 'custom_days') {
      return { selectedDays, separateZip: false };
    }
    if (exportScope === 'separate_zip') {
      return { selectedDays, separateZip: true };
    }
    return { selectedDays: availableDays, separateZip: false };
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting('excel');
      await exportScheduleToExcel(currentActiveWeek, getEffectiveOptions());
      onClose();
    } catch (e: any) {
      alert('Erro ao exportar planilha Excel: ' + (e.message || 'Verifique os dados da grade.'));
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting('pdf');
      await exportScheduleToPDF(currentActiveWeek, getEffectiveOptions());
      onClose();
    } catch (e: any) {
      alert('Erro ao gerar documento PDF: ' + (e.message || 'Verifique os dados da grade.'));
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPNG = async () => {
    try {
      setIsExporting('png');
      await exportScheduleToPNG(currentActiveWeek, getEffectiveOptions());
      onClose();
    } catch (e: any) {
      alert('Erro ao gerar imagem PNG: ' + (e.message || 'Verifique os dados da grade.'));
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportBackup = () => {
    try {
      setIsExporting('backup');
      exportBackupJSON(currentAllWeeks);
      onClose();
    } catch (e: any) {
      alert('Erro ao gerar arquivo de backup: ' + (e.message || 'Erro inesperado.'));
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Exportar Grade de Horários
            </h3>
            <p className="text-xs text-slate-500">
              {currentActiveWeek.title} • {currentActiveWeek.dateRange || 'Semana Regular'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Escolha de Escopo / Dias */}
        <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Seleção de Dias para Exportação
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setExportScope('all_together')}
              className={`p-2 rounded-lg text-xs font-semibold border text-left transition flex flex-col justify-between ${
                exportScope === 'all_together'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                <span>Tudo Junto</span>
              </div>
              <span className={`text-[10px] mt-1 font-normal ${exportScope === 'all_together' ? 'text-indigo-100' : 'text-slate-400'}`}>
                1 arquivo completo
              </span>
            </button>

            <button
              type="button"
              onClick={() => setExportScope('single_day')}
              className={`p-2 rounded-lg text-xs font-semibold border text-left transition flex flex-col justify-between ${
                exportScope === 'single_day'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Dia Específico</span>
              </div>
              <span className={`text-[10px] mt-1 font-normal ${exportScope === 'single_day' ? 'text-indigo-100' : 'text-slate-400'}`}>
                Apenas 1 dia
              </span>
            </button>

            <button
              type="button"
              onClick={() => setExportScope('custom_days')}
              className={`p-2 rounded-lg text-xs font-semibold border text-left transition flex flex-col justify-between ${
                exportScope === 'custom_days'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Dias Escolhidos</span>
              </div>
              <span className={`text-[10px] mt-1 font-normal ${exportScope === 'custom_days' ? 'text-indigo-100' : 'text-slate-400'}`}>
                Juntos em 1 arquivo
              </span>
            </button>

            <button
              type="button"
              onClick={() => setExportScope('separate_zip')}
              className={`p-2 rounded-lg text-xs font-semibold border text-left transition flex flex-col justify-between ${
                exportScope === 'separate_zip'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1">
                <FolderArchive className="w-3.5 h-3.5" />
                <span>Separar em ZIP</span>
              </div>
              <span className={`text-[10px] mt-1 font-normal ${exportScope === 'separate_zip' ? 'text-indigo-100' : 'text-slate-400'}`}>
                1 arquivo por dia (.zip)
              </span>
            </button>
          </div>

          {/* Sub-controls based on scope */}
          {exportScope === 'single_day' && (
            <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
              <span className="text-xs text-slate-600 font-medium">Escolha o dia:</span>
              <select
                value={singleDay}
                onChange={(e) => setSingleDay(e.target.value as DayOfWeek)}
                className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {availableDays.map((d) => {
                  const meta = DAYS_OF_WEEK.find((m) => m.key === d);
                  return (
                    <option key={d} value={d}>
                      {meta?.label || d}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {(exportScope === 'custom_days' || exportScope === 'separate_zip') && (
            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                <span>Selecione os dias a incluir:</span>
                <button
                  type="button"
                  onClick={selectAllDays}
                  className="text-[11px] text-indigo-600 hover:underline font-semibold"
                >
                  Selecionar Todos
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availableDays.map((d) => {
                  const meta = DAYS_OF_WEEK.find((m) => m.key === d);
                  const isChecked = selectedDays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition ${
                        isChecked
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-300" />
                      )}
                      <span>{meta?.label || d}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
          
          {/* Excel (.xlsx) */}
          <div
            onClick={handleExportExcel}
            className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl hover:bg-emerald-100/60 transition cursor-pointer flex flex-col justify-between space-y-3 group"
          >
            <div className="flex items-start justify-between">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-2xs">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                {exportScope === 'separate_zip' ? '.ZIP (.XLSX)' : '.XLSX'}
              </span>
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 group-hover:text-emerald-900">
                Planilha Excel Formatada
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {exportScope === 'separate_zip'
                  ? 'Gera uma planilha .xlsx por dia e empacota em um arquivo compactado .zip.'
                  : 'Colunas de turmas, tutores em janela, células mescladas para intervalos e aba de carga horária.'}
              </p>
            </div>
            <button
              disabled={isExporting === 'excel'}
              className="w-full py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
            >
              {isExporting === 'excel' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{exportScope === 'separate_zip' ? 'Baixar Planilhas em ZIP' : 'Baixar Planilha Excel'}</span>
            </button>
          </div>

          {/* PDF Document */}
          <div
            onClick={handleExportPDF}
            className="p-4 bg-rose-50/50 border border-rose-200 rounded-2xl hover:bg-rose-100/60 transition cursor-pointer flex flex-col justify-between space-y-3 group"
          >
            <div className="flex items-start justify-between">
              <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-2xs">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full">
                {exportScope === 'separate_zip' ? '.ZIP (.PDF)' : '.PDF'}
              </span>
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 group-hover:text-rose-900">
                Documento PDF para Impressão
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {exportScope === 'separate_zip'
                  ? 'Gera um PDF paisagem por dia e empacota todos em um arquivo .zip.'
                  : 'Layout paisagem em alta nitidez, pronto para impressão e mural escolar.'}
              </p>
            </div>
            <button
              disabled={isExporting === 'pdf'}
              className="w-full py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
            >
              {isExporting === 'pdf' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{exportScope === 'separate_zip' ? 'Baixar PDFs em ZIP' : 'Baixar Documento PDF'}</span>
            </button>
          </div>

          {/* PNG Image */}
          <div
            onClick={handleExportPNG}
            className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl hover:bg-blue-100/60 transition cursor-pointer flex flex-col justify-between space-y-3 group"
          >
            <div className="flex items-start justify-between">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-2xs">
                <Image className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full">
                {exportScope === 'separate_zip' ? '.ZIP (.PNG)' : '.PNG'}
              </span>
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 group-hover:text-blue-900">
                Imagem em Alta Resolução
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {exportScope === 'separate_zip'
                  ? 'Gera uma imagem PNG por dia em alta resolução em arquivo compactado .zip.'
                  : 'Imagem nítida ideal para compartilhar pelo WhatsApp ou redes sociais.'}
              </p>
            </div>
            <button
              disabled={isExporting === 'png'}
              className="w-full py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
            >
              {isExporting === 'png' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{exportScope === 'separate_zip' ? 'Baixar Imagens em ZIP' : 'Baixar Imagem PNG'}</span>
            </button>
          </div>

          {/* Backup JSON */}
          <div
            onClick={handleExportBackup}
            className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition cursor-pointer flex flex-col justify-between space-y-3 group"
          >
            <div className="flex items-start justify-between">
              <div className="p-2.5 bg-slate-700 text-white rounded-xl shadow-2xs">
                <Database className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full">
                .JSON
              </span>
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 group-hover:text-slate-950">
                Backup Completo do Sistema
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Arquivo contendo todas as semanas, turmas, professores, regras e configurações para restauração posterior.
              </p>
            </div>
            <button
              disabled={isExporting === 'backup'}
              className="w-full py-2 text-xs font-semibold text-white bg-slate-700 hover:bg-slate-800 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
            >
              {isExporting === 'backup' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Baixar Backup Completo</span>
            </button>
          </div>

        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Compatível com Google Planilhas, Excel, Adobe Reader e navegadores web.</span>
          <button
            onClick={onClose}
            className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
