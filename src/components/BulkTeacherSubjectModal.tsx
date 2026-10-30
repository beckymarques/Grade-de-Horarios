import React, { useState } from 'react';
import {
  Users,
  GraduationCap,
  BookOpen,
  Plus,
  Trash2,
  FileText,
  Sparkles,
  CheckCircle2,
  X,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';
import { TeacherAllowedShift } from '../types';

interface BulkTeacherSubjectModalProps {
  onClose: () => void;
}

interface TeacherRow {
  id: string;
  name: string;
  shortName: string;
  subjectsStr: string;
  allowedShift: TeacherAllowedShift;
  maxConsecutive: number;
}

export const BulkTeacherSubjectModal: React.FC<BulkTeacherSubjectModalProps> = ({ onClose }) => {
  const { activeWeek, bulkAddTeachersAndSubjects } = useSchedule();
  const [activeTab, setActiveTab] = useState<'table' | 'text'>('text');

  // Textarea input
  const [textInput, setTextInput] = useState<string>(
    `Prof. Carlos Silva | Matemática, Física | Manhã\nProfa. Maria Eduarda | História, Sociologia, Filosofia | Tarde\nProf. Roberto Oliveira | Química, Biologia | Todos\nProfa. Juliana Mendes | Português, Redação, Literatura | Manhã\nProf. Lucas Andrade | Educação Física, Inglês | Todos`
  );

  // Table rows input
  const [rows, setRows] = useState<TeacherRow[]>([
    {
      id: 'row_1',
      name: 'Prof. Carlos Silva',
      shortName: 'Carlos',
      subjectsStr: 'Matemática, Física',
      allowedShift: 'morning',
      maxConsecutive: 3,
    },
    {
      id: 'row_2',
      name: 'Profa. Maria Eduarda',
      shortName: 'Maria',
      subjectsStr: 'História, Sociologia',
      allowedShift: 'afternoon',
      maxConsecutive: 3,
    },
  ]);

  const [feedback, setFeedback] = useState<{ countTeachers: number; countSubjects: number } | null>(null);

  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        id: `row_${Date.now()}`,
        name: '',
        shortName: '',
        subjectsStr: '',
        allowedShift: 'all',
        maxConsecutive: 3,
      },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((r) => r.id !== id));
    }
  };

  const handleRowChange = (id: string, field: keyof TeacherRow, value: any) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const parseShift = (str: string): TeacherAllowedShift => {
    const s = str.toLowerCase();
    if (s.includes('manhã') && s.includes('tarde')) return 'morning_afternoon';
    if (s.includes('manhã') && s.includes('noite')) return 'morning_night';
    if (s.includes('tarde') && s.includes('noite')) return 'afternoon_night';
    if (s.includes('manhã') || s.includes('manha')) return 'morning';
    if (s.includes('tarde')) return 'afternoon';
    if (s.includes('noite')) return 'night';
    return 'all';
  };

  const handleConfirm = () => {
    const itemsToCreate: {
      teacherName: string;
      shortName?: string;
      subjectNames: string[];
      allowedShift?: TeacherAllowedShift;
      maxConsecutive?: number;
    }[] = [];

    if (activeTab === 'text') {
      const lines = textInput.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        // format: Nome | Disciplinas separadas por vírgula | Turno (opcional)
        const parts = trimmed.split('|').map((p) => p.trim());
        const teacherName = parts[0];
        if (!teacherName) continue;

        const subjectNames = parts[1]
          ? parts[1].split(',').map((s) => s.trim()).filter(Boolean)
          : [];

        const shift = parts[2] ? parseShift(parts[2]) : 'all';

        itemsToCreate.push({
          teacherName,
          shortName: teacherName.replace(/^prof(a)?\.\s*/i, '').split(' ')[0],
          subjectNames,
          allowedShift: shift,
          maxConsecutive: 3,
        });
      }
    } else {
      for (const row of rows) {
        if (!row.name.trim()) continue;
        const subjectNames = row.subjectsStr
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        itemsToCreate.push({
          teacherName: row.name.trim(),
          shortName: row.shortName.trim() || row.name.trim().split(' ')[0],
          subjectNames,
          allowedShift: row.allowedShift,
          maxConsecutive: row.maxConsecutive,
        });
      }
    }

    if (itemsToCreate.length === 0) {
      alert('Nenhum professor válido para cadastrar. Preencha ao menos uma linha.');
      return;
    }

    const result = bulkAddTeachersAndSubjects(itemsToCreate);
    setFeedback({
      countTeachers: result.createdTeachers,
      countSubjects: result.createdSubjects,
    });

    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const loadPresetExample = () => {
    setTextInput(
      `Prof. Carlos Silva | Matemática, Física | Manhã\nProfa. Maria Eduarda | História, Sociologia, Filosofia | Tarde\nProf. Roberto Oliveira | Química, Biologia | Todos\nProfa. Juliana Mendes | Português, Redação, Literatura | Manhã\nProf. Lucas Andrade | Educação Física, Inglês | Todos\nProfa. Patrícia Santos | Artes, Espanhol | Tarde`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Cadastro em Massa de Professores & Disciplinas
              </h3>
              <p className="text-xs text-slate-500">
                Crie professores e disciplinas em segundos com alocação automática
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher: Text vs Table */}
        <div className="flex items-center gap-2 pt-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeTab === 'text'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Colar Texto / Lista Rápida</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('table')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeTab === 'table'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Preenchimento em Tabela</span>
          </button>
        </div>

        {/* Success Feedback banner */}
        {feedback && (
          <div className="mt-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 text-xs font-semibold animate-in zoom-in-95">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              Sucesso! Foram cadastrados <strong>{feedback.countTeachers} professores</strong> e criadas <strong>{feedback.countSubjects} novas disciplinas</strong> com alocação vinculada!
            </span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          
          {activeTab === 'text' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Formato: Nome do Professor | Disciplinas (separadas por vírgula) | Turno (opcional)
                </span>
                <button
                  type="button"
                  onClick={loadPresetExample}
                  className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                >
                  Carregar Exemplo
                </button>
              </div>

              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={10}
                placeholder="Exemplo:&#10;Prof. Carlos Silva | Matemática, Física | Manhã&#10;Profa. Maria Eduarda | História, Sociologia | Tarde"
                className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed"
              />

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Criação Automática Inteligente:</strong> Se a disciplina (ex: "Sociologia", "Física Moderna") ainda não existir no colégio, ela será criada automaticamente e atribuída de imediato àquele professor!
                </div>
              </div>
            </div>
          )}

          {activeTab === 'table' && (
            <div className="space-y-3">
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Nome do Professor</th>
                      <th className="p-2.5">Disciplinas (vírgulas)</th>
                      <th className="p-2.5">Turno Permitido</th>
                      <th className="p-2.5 w-12 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/50">
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => handleRowChange(row.id, 'name', e.target.value)}
                            placeholder="Prof. Nome Completo"
                            className="w-full p-1.5 border border-slate-300 rounded-lg text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.subjectsStr}
                            onChange={(e) => handleRowChange(row.id, 'subjectsStr', e.target.value)}
                            placeholder="Ex: Matemática, Física"
                            className="w-full p-1.5 border border-slate-300 rounded-lg text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={row.allowedShift}
                            onChange={(e) => handleRowChange(row.id, 'allowedShift', e.target.value)}
                            className="w-full p-1.5 border border-slate-300 rounded-lg text-xs"
                          >
                            <option value="all">Todos os turnos</option>
                            <option value="morning">Apenas Manhã</option>
                            <option value="afternoon">Apenas Tarde</option>
                            <option value="night">Apenas Noite</option>
                            <option value="morning_afternoon">Manhã e Tarde</option>
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-md"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Linha</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3.5 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Cadastrar e Vincular em Massa</span>
          </button>
        </div>

      </div>
    </div>
  );
};
