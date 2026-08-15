import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Image,
  Database,
  X,
  Download,
  Check,
  Loader2,
} from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';
import {
  exportScheduleToExcel,
  exportScheduleToPDF,
  exportScheduleToPNG,
  exportBackupJSON,
} from '../utils/exportEngine';

interface ExportModalProps {
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ onClose }) => {
  const { activeWeek, weeks } = useSchedule();
  const [isExporting, setIsExporting] = useState<string | null>(null);

  if (!activeWeek) return null;

  const handleExportExcel = async () => {
    setIsExporting('excel');
    try {
      exportScheduleToExcel(activeWeek);
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar planilha Excel.');
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPNG = async () => {
    setIsExporting('png');
    try {
      await exportScheduleToPNG(
        'exportable_grid_view',
        `Grade_${activeWeek.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`
      );
    } catch (err) {
      console.error(err);
      alert('Erro ao exportar imagem PNG.');
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting('pdf');
    try {
      await exportScheduleToPDF('exportable_grid_view', activeWeek.title);
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar documento PDF.');
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportJSON = () => {
    exportBackupJSON(weeks);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Exportar Grade Semanal
            </h3>
            <p className="text-xs text-slate-500">
              {activeWeek.title} • {activeWeek.dateRange}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-5">
          
          {/* Excel (.xlsx) */}
          <div
            onClick={handleExportExcel}
            className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl hover:bg-emerald-100/60 transition cursor-pointer flex flex-col justify-between space-y-3 group"
          >
            <div className="flex items-start justify-between">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-2xs">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                .XLSX
              </span>
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 group-hover:text-emerald-900">
                Planilha Excel Formatada
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Replicando o layout da sua planilha: colunas de Turmas, bloco "Tutores em Janela", Avisos e células mescladas para intervalos.
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
              <span>Baixar Excel</span>
            </button>
          </div>

          {/* PDF Document */}
          <div
            onClick={handleExportPDF}
            className="p-4 bg-rose-50/50 border border-rose-200 rounded-2xl hover:bg-rose-100/60 transition cursor-pointer flex flex-col justify-between space-y-3 group"
          >
            <div className="flex items-start justify-between">
              <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-2xs">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full">
                .PDF
              </span>
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 group-hover:text-rose-900">
                Documento PDF para Impressão
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Layout paisagem de alta legibilidade, pronto para imprimir e afixar na sala dos professores ou murais.
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
              <span>Baixar PDF</span>
            </button>
          </div>

          {/* PNG Image */}
          <div
            onClick={handleExportPNG}
            className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl hover:bg-blue-100/60 transition cursor-pointer flex flex-col justify-between space-y-3 group"
          >
            <div className="flex items-start justify-between">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-2xs">
                <Image className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full">
                .PNG
              </span>
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 group-hover:text-blue-900">
                Imagem em Alta Resolução
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Ideal para envio rápido no WhatsApp de professores, coordenadores e alunos.
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
              <span>Baixar PNG</span>
            </button>
          </div>

          {/* JSON Backup */}
          <div
            onClick={handleExportJSON}
            className="p-4 bg-purple-50/50 border border-purple-200 rounded-2xl hover:bg-purple-100/60 transition cursor-pointer flex flex-col justify-between space-y-3 group"
          >
            <div className="flex items-start justify-between">
              <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-2xs">
                <Database className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full">
                .JSON
              </span>
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 group-hover:text-purple-900">
                Backup Completo de Dados
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Exporta todas as semanas, turmas, regras e grades para você abrir em outro computador sem perder nada.
              </p>
            </div>
            <button
              className="w-full py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar JSON</span>
            </button>
          </div>

        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
