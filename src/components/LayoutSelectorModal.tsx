import React, { useState } from 'react';
import {
  Palette,
  CheckCircle2,
  Table,
  LayoutGrid,
  Columns3,
  SlidersHorizontal,
  Sparkles,
  ArrowRight,
  Eye,
  Check,
} from 'lucide-react';
import { TimetableLayoutTheme } from '../types';

interface LayoutSelectorModalProps {
  currentTheme: TimetableLayoutTheme;
  onSelectTheme: (theme: TimetableLayoutTheme) => void;
  onClose?: () => void;
  isInitialSelection?: boolean;
}

interface LayoutOption {
  id: TimetableLayoutTheme;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  icon: React.FC<{ className?: string }>;
  tags: string[];
}

export const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: 'classic_table',
    title: 'Planilha Clássica / Tabela Executiva',
    subtitle: 'Estilo Institucional Limpo (Excel)',
    description: 'Linhas nítidas de alta definição, cabeçalhos sóbrios, espaçamento equilibrado e máxima legibilidade para impressão e secretaria.',
    badge: 'Mais Popular',
    icon: Table,
    tags: ['Grade Nítida', 'Alta Legibilidade', 'Ideal p/ Excel'],
  },
  {
    id: 'modern_cards',
    title: 'Cartões Modernos (Visual Cards)',
    subtitle: 'Estilo Contemporâneo & Fluido',
    description: 'Células em cartões elevados com sombras suaves, pílulas de cores vibrantes para matérias, avatares para professores e cantos arredondados.',
    badge: 'Moderno',
    icon: LayoutGrid,
    tags: ['Design Clean', 'Badges Coloridas', 'Interativo'],
  },
  {
    id: 'school_board',
    title: 'Mural Escolar / Quadro de Horários',
    subtitle: 'Alto Contraste & Mural de Avisos',
    description: 'Blocos sólidos de alto contraste, tipografia em destaque, blocos coloridos fáceis de ler de longe em projetores e murais de sala.',
    badge: 'Alto Contraste',
    icon: Columns3,
    tags: ['Projetores', 'Mural Físico', 'Blocos Sólidos'],
  },
  {
    id: 'compact_density',
    title: 'Alta Densidade / Visão Panorâmica',
    subtitle: 'Máximo Aproveitamento de Tela',
    description: 'Espaçamento ultra-compacto com micro-tags, permitindo visualizar todas as turmas e tempos sem necessidade de rolagem excessiva.',
    badge: 'Compacto',
    icon: SlidersHorizontal,
    tags: ['Sem Rolagem', 'Micro-Tags', 'Multiturmas'],
  },
];

export const LayoutSelectorModal: React.FC<LayoutSelectorModalProps> = ({
  currentTheme,
  onSelectTheme,
  onClose,
  isInitialSelection = false,
}) => {
  const [selected, setSelected] = useState<TimetableLayoutTheme>(currentTheme);

  const handleConfirm = () => {
    onSelectTheme(selected);
    localStorage.setItem('prevest_layout_theme_v1', selected);
    localStorage.setItem('prevest_has_chosen_layout_v1', 'true');
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8">
        
        {/* Modal Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex p-3 bg-indigo-50 text-indigo-700 rounded-2xl mb-3 shadow-xs">
            <Palette className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {isInitialSelection ? 'Escolha o Layout Visual da Grade' : 'Personalizar Layout da Grade'}
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Selecione como deseja visualizar e organizar os horários das turmas, professores e tutores. Você pode alternar entre os layouts a qualquer momento.
          </p>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 mb-8">
          {LAYOUT_OPTIONS.map((opt) => {
            const isChosen = selected === opt.id;
            const Icon = opt.icon;

            return (
              <div
                key={opt.id}
                onClick={() => setSelected(opt.id)}
                className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 text-left flex flex-col justify-between ${
                  isChosen
                    ? 'border-indigo-600 bg-indigo-50/40 shadow-md ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 bg-white'
                }`}
              >
                <div>
                  {/* Top Bar inside Card */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isChosen
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-indigo-700 block">
                          {opt.subtitle}
                        </span>
                        <h3 className="text-sm font-extrabold text-slate-900">
                          {opt.title}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {opt.badge}
                      </span>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition ${
                          isChosen
                            ? 'bg-indigo-600 text-white'
                            : 'border-2 border-slate-300'
                        }`}
                      >
                        {isChosen && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {opt.description}
                  </p>

                  {/* Visual Layout Mockup Preview */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 mb-3 shadow-2xs">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Eye className="w-3 h-3 text-slate-400" /> Prévia Visual
                    </div>

                    {opt.id === 'classic_table' && (
                      <div className="border border-slate-300 rounded text-[10px] overflow-hidden">
                        <div className="bg-slate-800 text-white px-2 py-1 font-mono flex justify-between">
                          <span>07:00 - 07:50 (1º Tempo)</span>
                          <span className="text-emerald-400">✓ Válido</span>
                        </div>
                        <div className="p-1.5 bg-slate-50 border-t border-slate-200 grid grid-cols-2 gap-1 text-[9px]">
                          <div className="p-1 bg-white border border-slate-200 rounded font-semibold text-slate-800">
                            Matemática 1 • Prof. Carlos
                          </div>
                          <div className="p-1 bg-white border border-slate-200 rounded font-semibold text-slate-800">
                            Física 2 • Prof. Júlio
                          </div>
                        </div>
                      </div>
                    )}

                    {opt.id === 'modern_cards' && (
                      <div className="p-2 bg-slate-50/80 rounded-xl space-y-1.5 border border-slate-200">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
                          <span>07:00 • 1º Tempo</span>
                          <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded-full font-medium">Turma Medicina</span>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-xs border border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-md inline-block mb-0.5">
                              Matemática 1
                            </span>
                            <div className="text-[10px] text-slate-600 font-medium">Prof. Carlos Eduardo</div>
                          </div>
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">Sala 101</span>
                        </div>
                      </div>
                    )}

                    {opt.id === 'school_board' && (
                      <div className="p-2 bg-slate-900 rounded-xl text-white space-y-1.5">
                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-300">
                          <span>07:00 - 07:50</span>
                          <span className="bg-amber-400 text-slate-900 px-1 rounded font-bold">1º TEMPO</span>
                        </div>
                        <div className="p-1.5 bg-blue-600 rounded text-[10px] font-bold flex items-center justify-between">
                          <span>FÍSICA 1 (MECÂNICA)</span>
                          <span className="text-[9px] bg-blue-800 px-1 py-0.2 rounded font-normal">PROF. MARCOS</span>
                        </div>
                      </div>
                    )}

                    {opt.id === 'compact_density' && (
                      <div className="grid grid-cols-3 gap-1 text-[9px] font-mono border border-slate-200 p-1.5 rounded bg-slate-50">
                        <div className="p-1 bg-white border border-slate-200 rounded text-center">
                          <span className="font-bold text-blue-700 block">Mat 1</span>
                          <span className="text-slate-500 text-[8px]">Carlos</span>
                        </div>
                        <div className="p-1 bg-white border border-slate-200 rounded text-center">
                          <span className="font-bold text-emerald-700 block">Quím 1</span>
                          <span className="text-slate-500 text-[8px]">Ana</span>
                        </div>
                        <div className="p-1 bg-white border border-slate-200 rounded text-center">
                          <span className="font-bold text-purple-700 block">Bio 1</span>
                          <span className="text-slate-500 text-[8px]">Bruno</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags Footer */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {opt.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            Layout selecionado:{' '}
            <strong className="text-slate-900">
              {LAYOUT_OPTIONS.find((o) => o.id === selected)?.title}
            </strong>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onClose && !isInitialSelection && (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancelar
              </button>
            )}

            <button
              type="button"
              id="btn_confirm_layout_choice"
              onClick={handleConfirm}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-md transition"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              Confirmar e Usar este Layout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
