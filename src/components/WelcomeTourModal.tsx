import React, { useState } from 'react';
import {
  Sparkles,
  Clock,
  Users,
  GraduationCap,
  Scale,
  Download,
  Calendar,
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileCode,
  Wand2,
  Palette,
  Laptop,
  Check,
} from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';

interface WelcomeTourModalProps {
  onClose: () => void;
  isFirstTime?: boolean;
}

export const WelcomeTourModal: React.FC<WelcomeTourModalProps> = ({ onClose, isFirstTime = false }) => {
  const { resetToSampleSchool, resetToEmptySchool } = useSchedule();
  const [currentStep, setCurrentStep] = useState<number>(0);

  const steps = [
    {
      title: 'Bem-vindo ao Gerador de Grade Semanal!',
      subtitle: 'Visão Geral do Sistema',
      icon: Sparkles,
      iconColor: 'text-amber-500 bg-amber-50',
      description:
        'Uma solução completa para escolas, colégios e cursos pré-vestibulares. Otimize horários, evite choques de professores, aloque salas e preveja semanas remotas ou presenciais com facilidade.',
      bullets: [
        'Resolução automática com algoritmo de restrições exatas.',
        'Detecção inteligente de Tutores em Janela para substituições.',
        'Suporte completo a turmas agrupadas e semanas remotas/híbridas.',
      ],
      showStartOptions: true,
    },
    {
      title: '1. Tempos do Dia & Assistente de Horários',
      subtitle: 'Flexibilidade total para seus turnos',
      icon: Clock,
      iconColor: 'text-indigo-600 bg-indigo-50',
      description:
        'Configure o horário de início, duração dos tempos de aula e dias letivos da semana. Conte com o Assistente Passo a Passo (Wizard) que você pode reabrir a qualquer momento.',
      bullets: [
        '🍽️ Almoço Opcional: Ative ou desative se sua escola tiver apenas 1 turno.',
        '🍲 Jantar Opcional: Perfeito para escolas com período noturno ou integral estendido.',
        '☕ Recreios e intervalos personalizáveis por turno.',
      ],
    },
    {
      title: '2. Turmas e Ambientes Físicos',
      subtitle: 'Organização de salas e agrupamentos',
      icon: Users,
      iconColor: 'text-sky-600 bg-sky-50',
      description:
        'Cadastre as turmas do colégio com cores personalizadas e defina salas de aula padrão.',
      bullets: [
        'Turmas agrupadas (ex: 1º e 2º Ano no Auditório) recebem a mesma aula de forma sincronizada.',
        'Salas compartilhadas e laboratórios evitam ocupação simultânea.',
        'Reordenação fácil e visão por turno (Manhã, Tarde, Noite).',
      ],
    },
    {
      title: '3. Professores & Cadastro em Massa',
      subtitle: 'Velocidade e gestão de indisponibilidades',
      icon: GraduationCap,
      iconColor: 'text-emerald-600 bg-emerald-50',
      description:
        'Cadastre professores individualmente ou use o novo botão "Cadastro em Massa" para colar uma lista e criar matérias e professores já vinculados em segundos.',
      bullets: [
        '⚡ Cadastro em Massa: cole "Nome | Disciplinas | Turno" e pronto!',
        'Restrição de turnos permitidos (ex: professor que só leciona de manhã).',
        'Controle de faltas programadas e limite de tempos consecutivos.',
      ],
    },
    {
      title: '4. Cargas Horárias & Regras Pedagógicas',
      subtitle: 'Equilíbrio e saúde cognitiva dos alunos',
      icon: Scale,
      iconColor: 'text-purple-600 bg-purple-50',
      description:
        'Defina quantas aulas semanais cada turma deve ter de cada matéria e aplique regras pedagógicas inteligentes.',
      bullets: [
        'Sem repetição de matéria no mesmo dia (com opção de exceção para aulas dobradas).',
        'Sem matérias pesadas seguidas (ex: evitar Física logo após Matemática).',
        'Regras obrigatórias (Hard) e preferências pedagógicas (Soft).',
      ],
    },
    {
      title: '5. Gerador Inteligente & Botão Desfazer',
      subtitle: 'Otimização com 1 clique e histórico',
      icon: Sparkles,
      iconColor: 'text-amber-500 bg-amber-50',
      description:
        'Clique em "Gerar Grade" para que o sistema aloque automaticamente todas as aulas cumprindo 100% das leis físicas e restrições.',
      bullets: [
        '✨ 1 Clique para gerar: se houver gargalos, o sistema mostra diagnósticos claros.',
        '↩️ Botão Desfazer (Ctrl+Z): volte atrás facilmente a qualquer momento se errar uma edição.',
        '🔒 Trava de células: fixe aulas específicas sem que o gerador as modifique.',
      ],
    },
    {
      title: '6. Semanas Remotas & Exportação Profissional',
      subtitle: 'Fidelidade visual para impressão e mural',
      icon: Download,
      iconColor: 'text-rose-600 bg-rose-50',
      description:
        'Alterne cada semana individualmente entre Presencial, Remoto (Online/EAD) ou Híbrido, sem alterar as demais semanas.',
      bullets: [
        '💻 Semanas Remotas com etiqueta visual clara e link de plataforma.',
        '4 Temas de Layout: Mural Escolar, Cartões Modernos, Planilha Clássica e Alta Densidade.',
        'Exportação fiel para PDF, imagem PNG de alta resolução e planilha Excel.',
      ],
    },
  ];

  const handleFinish = () => {
    localStorage.setItem('prevest_has_completed_tour_v2', 'true');
    localStorage.setItem('prevest_has_onboarded_v1', 'true');
    onClose();
  };

  const handleStartWithSample = () => {
    resetToSampleSchool();
    handleFinish();
  };

  const handleStartEmpty = () => {
    resetToEmptySchool();
    handleFinish();
  };

  const stepData = steps[currentStep];
  const StepIcon = stepData.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] relative overflow-hidden">
        
        {/* Subtle decorative glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-100 rounded-full blur-3xl pointer-events-none opacity-60" />

        {/* Top bar: Step indicators & Skip button */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 relative z-10 shrink-0">
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentStep === idx
                    ? 'w-7 bg-indigo-600'
                    : idx < currentStep
                    ? 'w-2 bg-indigo-300'
                    : 'w-2 bg-slate-200'
                }`}
                title={`Ir para passo ${idx + 1}`}
              />
            ))}
            <span className="text-[11px] font-bold text-slate-400 ml-2">
              Passo {currentStep + 1} de {steps.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            className="text-xs font-bold text-slate-400 hover:text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            Pular Tour ✕
          </button>
        </div>

        {/* Tour Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-2xl shadow-xs shrink-0 ${stepData.iconColor}`}>
              <StepIcon className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                {stepData.subtitle}
              </span>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
                {stepData.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                {stepData.description}
              </p>
            </div>
          </div>

          {/* Key highlights / bullets */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Destaques Principais:
            </div>
            {stepData.bullets.map((bullet, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>

          {/* Quick Start Options (on first step or last step) */}
          {stepData.showStartOptions && (
            <div className="pt-2">
              <div className="text-xs font-bold text-slate-700 mb-2">
                Como deseja iniciar seus dados?
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleStartWithSample}
                  className="p-3 bg-indigo-50 border-2 border-indigo-500 rounded-xl text-left hover:bg-indigo-100/70 transition cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <span>✨ Exemplo Completo</span>
                      <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-bold">
                        Recomendado
                      </span>
                    </div>
                    <div className="text-[11px] text-indigo-800 mt-0.5">
                      Com turmas, matérias e professores pré-carregados
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-indigo-600 shrink-0 ml-2" />
                </button>

                <button
                  type="button"
                  onClick={handleStartEmpty}
                  className="p-3 bg-white border border-slate-200 rounded-xl text-left hover:bg-slate-50 transition cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      📁 Começar do Zero (Vazio)
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Para cadastrar os dados da sua instituição
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 shrink-0 relative z-10">
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                <span>Próximo Passo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Concluir Tour e Começar!</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
