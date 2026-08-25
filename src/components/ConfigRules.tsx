import React, { useState } from 'react';
import {
  Scale,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Sliders,
  Sparkles,
  Info,
  X,
  Zap,
  UserX,
  Calendar,
  Edit2,
  Save,
  Clock,
  DoorClosed,
  UserCheck,
  Ban,
  Pin,
} from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';
import { DayOfWeek, DAYS_OF_WEEK, RuleType, ScheduleRule, getDisplayClasses } from '../types';

export const ConfigRules: React.FC = () => {
  const { activeWeek, addRule, updateRule, deleteRule, toggleRule } = useSchedule();

  const [isAdding, setIsAdding] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Form State (used for both Add and Edit)
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState<RuleType>('no_consecutive_heavy_subjects');
  const [isMandatory, setIsMandatory] = useState(true);
  const [description, setDescription] = useState('');

  // Parametric selectors
  const [paramTeacherId, setParamTeacherId] = useState('');
  const [paramSubstituteTeacherId, setParamSubstituteTeacherId] = useState('');
  const [paramSubjectId, setParamSubjectId] = useState('');
  const [paramClassId, setParamClassId] = useState('');
  const [paramDay, setParamDay] = useState<DayOfWeek | ''>('');
  const [paramSlotId, setParamSlotId] = useState('');
  const [paramSlotIds, setParamSlotIds] = useState<string[]>([]);
  const [paramMaxConsecutive, setParamMaxConsecutive] = useState(2);
  const [paramReason, setParamReason] = useState('Falta de professor titular - reposição com aulas dobradas');
  const [paramLunchMaxStart, setParamLunchMaxStart] = useState('12:30');
  const [paramLunchMaxEnd, setParamLunchMaxEnd] = useState('13:30');

  // Inline description edit
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineDescText, setInlineDescText] = useState('');

  if (!activeWeek) return null;

  const displayClasses = getDisplayClasses(activeWeek.classes);
  const lessonSlots = activeWeek.generatedSlots.filter((s) => s.type === 'lesson');

  const resetForm = () => {
    setIsAdding(false);
    setEditingRuleId(null);
    setRuleName('');
    setRuleType('no_consecutive_heavy_subjects');
    setIsMandatory(true);
    setDescription('');
    setParamTeacherId('');
    setParamSubstituteTeacherId('');
    setParamSubjectId('');
    setParamClassId('');
    setParamDay('');
    setParamSlotId('');
    setParamSlotIds([]);
    setParamMaxConsecutive(2);
    setParamReason('');
    setParamLunchMaxStart('12:30');
    setParamLunchMaxEnd('13:30');
  };

  const handleOpenEdit = (rule: ScheduleRule) => {
    setIsAdding(true);
    setEditingRuleId(rule.id);
    setRuleName(rule.name);
    setRuleType(rule.type);
    setIsMandatory(rule.isMandatory);
    setDescription(rule.description || '');
    setParamTeacherId(rule.parameters?.teacherId || '');
    setParamSubstituteTeacherId(rule.parameters?.substituteTeacherId || '');
    setParamSubjectId(rule.parameters?.subjectId || '');
    setParamClassId(rule.parameters?.classId || '');
    setParamDay((rule.parameters?.day as DayOfWeek) || '');
    setParamSlotId(rule.parameters?.slotId || '');
    setParamSlotIds(rule.parameters?.slotIds || (rule.parameters?.slotId ? [rule.parameters.slotId] : []));
    setParamMaxConsecutive(rule.parameters?.maxConsecutive || 2);
    setParamReason(rule.parameters?.reason || '');
    setParamLunchMaxStart(rule.parameters?.maxStartTime || rule.parameters?.targetTime || '12:30');
    setParamLunchMaxEnd(rule.parameters?.maxEndTime || rule.parameters?.targetTime || '13:30');
  };

  const handleOpenDoubleLessonPreset = () => {
    setIsAdding(true);
    setEditingRuleId(null);
    setRuleType('double_lesson_substitution');
    setRuleName('Exceção: Dobrar aulas de disciplina por falta de professor');
    setIsMandatory(true);
    setDescription('Autoriza tempos geminados/dobrados para suprir ausência ou intensivo');
    setParamDay(activeWeek.activeDays[0] || 'SEG');
    setParamSlotIds([]);
    setParamMaxConsecutive(2);
    setParamReason('Falta de professor / Dobra emergencial');
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    const isException = ruleType === 'double_lesson_substitution';

    const ruleData: ScheduleRule = {
      id: editingRuleId || `rule_${Date.now()}`,
      name: ruleName.trim(),
      type: ruleType,
      isMandatory,
      isEnabled: true,
      description: description.trim() || undefined,
      parameters: {
        teacherId: paramTeacherId || undefined,
        substituteTeacherId: paramSubstituteTeacherId || undefined,
        subjectId: paramSubjectId || undefined,
        classId: paramClassId || undefined,
        day: paramDay ? (paramDay as DayOfWeek) : undefined,
        slotId: paramSlotIds.length === 1 ? paramSlotIds[0] : (paramSlotId || undefined),
        slotIds: paramSlotIds.length > 0 ? paramSlotIds : undefined,
        maxConsecutive: paramMaxConsecutive,
        targetConsecutiveLessons: paramMaxConsecutive,
        maxStartTime: ruleType === 'lunch_max_start_time' ? paramLunchMaxStart : undefined,
        maxEndTime: ruleType === 'lunch_max_end_time' ? paramLunchMaxEnd : undefined,
        targetTime:
          ruleType === 'lunch_max_start_time'
            ? paramLunchMaxStart
            : ruleType === 'lunch_max_end_time'
            ? paramLunchMaxEnd
            : undefined,
        isWeeklyException: isException,
        reason: paramReason || undefined,
      },
    };

    if (editingRuleId) {
      updateRule(ruleData);
    } else {
      addRule(ruleData);
    }
    resetForm();
  };

  const handleSaveInlineDesc = (rule: ScheduleRule) => {
    updateRule({
      ...rule,
      description: inlineDescText.trim() || undefined,
    });
    setInlineEditId(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <Scale className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Regras da Semana — O Ponto Central
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            As regras mudam toda semana. Você pode criar, editar o nome, a descrição, ligar/desligar e alternar entre <strong>Obrigatória</strong> (o gerador nunca viola) ou <strong>Preferência</strong> (tenta cumprir e avisa se não deu).
          </p>
        </div>

        {!isAdding && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              id="btn_add_double_lesson_exception"
              onClick={handleOpenDoubleLessonPreset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl shadow-xs transition cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-600 shrink-0" />
              <span>⚡ Exceção: Dobrar Aula</span>
            </button>
            <button
              id="btn_add_rule"
              onClick={() => {
                resetForm();
                setIsAdding(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Nova Regra Parametrizada</span>
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Rule Form */}
      {isAdding && (
        <form
          onSubmit={handleSaveRule}
          className="bg-white p-5 rounded-2xl border-2 border-indigo-500 shadow-md space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Sliders className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {editingRuleId ? 'Editar Regra da Grade' : 'Criar Nova Regra da Grade'}
              </h3>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nome / Título da Regra
              </label>
              <input
                type="text"
                required
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="Ex: Proibir Física no último tempo, Fixar Prof. Carlos na quarta..."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tipo de Regra / Restrição
              </label>
              <select
                value={ruleType}
                onChange={(e) => {
                  const newType = e.target.value as RuleType;
                  setRuleType(newType);
                  if (!editingRuleId) {
                    if (newType === 'teacher_no_double_booking') {
                      setRuleName('Simultaneidade de Professor (Lei Física)');
                      setDescription('Nenhum professor pode ministrar aulas em duas turmas diferentes no mesmo horário.');
                    } else if (newType === 'shared_room') {
                      setRuleName('Restrição de Sala Compartilhada');
                      setDescription('Professores vinculados ao mesmo laboratório ou sala inteligente não podem ter aulas simultâneas.');
                    } else if (newType === 'lunch_max_start_time') {
                      setRuleName('Almoço deve começar no máximo às 12:30');
                      setDescription('O evento de almoço não pode iniciar após este horário');
                    } else if (newType === 'lunch_max_end_time') {
                      setRuleName('Almoço deve terminar no máximo às 13:30');
                      setDescription('As aulas da tarde devem recomeçar pontualmente');
                    } else if (newType === 'max_consecutive_teacher') {
                      setRuleName('Máximo de 3 aulas seguidas para professores');
                      setDescription('Evita desgaste de professores com aulas consecutivas');
                    } else if (newType === 'no_duplicate_subject_same_day') {
                      setRuleName('Não repetir a mesma disciplina no mesmo dia');
                      setDescription('Distribui as matérias ao longo dos dias da semana');
                    } else if (newType === 'no_consecutive_heavy_subjects') {
                      setRuleName('Não ter disciplinas pesadas consecutivas');
                      setDescription('Evita sobrecarga cognitiva com duas matérias difíceis seguidas');
                    } else if (newType === 'forbidden_slot') {
                      setRuleName('Horário proibido para disciplina ou professor');
                      setDescription('Impede que a matéria ou professor selecionado lecione no dia e tempo escolhidos.');
                    } else if (newType === 'fixed_slot') {
                      setRuleName('Fixar disciplina e professor em horário específico');
                      setDescription('Garante que a disciplina e o professor fiquem permanentemente alocados neste tempo exato.');
                    }
                  }
                }}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
              >
                <optgroup label="Leis Físicas & Espaço">
                  <option value="teacher_no_double_booking">👤 Simultaneidade de Professor (Lei Física)</option>
                  <option value="shared_room">🏫 Restrição de Sala Compartilhada / Laboratório</option>
                </optgroup>
                <optgroup label="Almoço e Eventos">
                  <option value="lunch_max_start_time">🍲 Almoço: Início no Máximo em Horário X</option>
                  <option value="lunch_max_end_time">🍲 Almoço: Término no Máximo em Horário X</option>
                </optgroup>
                <optgroup label="Exceções e Dobras de Aula">
                  <option value="double_lesson_substitution">⚡ Exceção: Dobrar Aulas de Disciplina</option>
                </optgroup>
                <optgroup label="Pedagógicas e Distribuição">
                  <option value="no_duplicate_subject_same_day">Distribuição: Não repetir matéria no mesmo dia</option>
                  <option value="no_consecutive_heavy_subjects">Didática: Não ter matérias pesadas seguidas</option>
                  <option value="max_consecutive_teacher">Descanso: Máximo de aulas seguidas de professor</option>
                </optgroup>
                <optgroup label="Restrições Pontuais">
                  <option value="forbidden_slot">🚫 Proibição: Horário proibido para matéria/professor</option>
                  <option value="fixed_slot">📌 Fixação: Fixar matéria/professor em horário específico</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Descrição / Justificativa (Aparece embaixo do título da regra)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Garante que os alunos e professores tenham pausa antes das aulas da tarde..."
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* DYNAMIC PARAMETER BLOCKS */}
          {ruleType === 'teacher_no_double_booking' && (
            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
              <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span>Lei Física de Simultaneidade de Professor</span>
              </div>
              <p className="text-xs text-indigo-900 leading-relaxed">
                Impede que o mesmo professor seja alocado em duas turmas diferentes no mesmo tempo/horário. Turmas agrupadas no mesmo auditório estão liberadas dessa restrição.
              </p>
            </div>
          )}

          {ruleType === 'shared_room' && (
            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
              <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <DoorClosed className="w-4 h-4 text-indigo-600" />
                <span>Restrição de Salas e Laboratórios Compartilhados</span>
              </div>
              <p className="text-xs text-indigo-900 leading-relaxed">
                Garante que professores que dividem o mesmo espaço físico (ex: Laboratório de Ciências ou Sala 3D) não tenham aulas simultâneas.
              </p>
            </div>
          )}

          {ruleType === 'lunch_max_start_time' && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>🍲 Limite de Início do Almoço</span>
              </div>
              <p className="text-[11px] text-amber-800">
                O evento de Almoço deverá começar no máximo até o horário selecionado. Se as aulas da manhã se estenderem além deste horário, a grade apresentará um erro de validação.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-40">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Horário Máximo de Início
                  </label>
                  <input
                    type="time"
                    required
                    value={paramLunchMaxStart}
                    onChange={(e) => {
                      setParamLunchMaxStart(e.target.value);
                      if (!editingRuleId) {
                        setRuleName(`Almoço deve começar no máximo às ${e.target.value}`);
                      }
                    }}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-800"
                  />
                </div>
                <div className="flex items-center gap-1.5 pt-4">
                  {['11:40', '12:00', '12:30', '13:00'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setParamLunchMaxStart(preset);
                        if (!editingRuleId) {
                          setRuleName(`Almoço deve começar no máximo às ${preset}`);
                        }
                      }}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition ${
                        paramLunchMaxStart === preset
                          ? 'bg-amber-600 text-white border-amber-600 font-bold'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {ruleType === 'lunch_max_end_time' && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>🍲 Limite de Término do Almoço</span>
              </div>
              <p className="text-[11px] text-amber-800">
                O evento de Almoço não poderá terminar após este horário (ex: as aulas da tarde devem recomeçar no máximo até as 13:30).
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-40">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Horário Máximo de Término
                  </label>
                  <input
                    type="time"
                    required
                    value={paramLunchMaxEnd}
                    onChange={(e) => {
                      setParamLunchMaxEnd(e.target.value);
                      if (!editingRuleId) {
                        setRuleName(`Almoço deve terminar no máximo às ${e.target.value}`);
                      }
                    }}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-800"
                  />
                </div>
                <div className="flex items-center gap-1.5 pt-4">
                  {['13:00', '13:30', '14:00', '14:30'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setParamLunchMaxEnd(preset);
                        if (!editingRuleId) {
                          setRuleName(`Almoço deve terminar no máximo às ${preset}`);
                        }
                      }}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition ${
                        paramLunchMaxEnd === preset
                          ? 'bg-amber-600 text-white border-amber-600 font-bold'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {ruleType === 'max_consecutive_teacher' && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl max-w-sm space-y-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Máximo de Aulas Seguidas (sem intervalo/almoço)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={paramMaxConsecutive}
                  onChange={(e) => setParamMaxConsecutive(parseInt(e.target.value) || 2)}
                  className="w-24 px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-bold"
                />
                <span className="text-xs text-slate-500">tempos consecutivos</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Qualquer intervalo ou almoço entre as aulas zera a contagem de aulas seguidas.
              </p>
            </div>
          )}

          {ruleType === 'double_lesson_substitution' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>Configurar Exceção de Dobra de Aula</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Disciplina a Dobrar
                  </label>
                  <select
                    value={paramSubjectId}
                    onChange={(e) => setParamSubjectId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Todas as Disciplinas</option>
                    {activeWeek.subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.shortName})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Turma</label>
                  <select
                    value={paramClassId}
                    onChange={(e) => setParamClassId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Todas as Turmas</option>
                    {displayClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Dia da Semana</label>
                  <select
                    value={paramDay}
                    onChange={(e) => setParamDay(e.target.value as DayOfWeek)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Todos os Dias da Semana</option>
                    {activeWeek.activeDays.map((d) => (
                      <option key={d} value={d}>
                        {DAYS_OF_WEEK.find((dw) => dw.key === d)?.label || d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* FORBIDDEN SLOT PARAMETERS */}
          {ruleType === 'forbidden_slot' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
              <div className="text-xs font-bold text-rose-900 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Ban className="w-4 h-4 text-rose-600" />
                  <span>Configurar Horário Proibido (Restrição de Horários)</span>
                </div>
                {paramSlotIds.length > 0 && (
                  <span className="text-[11px] font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-300">
                    {paramSlotIds.length} tempo(s) selecionado(s)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                Selecione o professor ou matéria que NÃO pode ser alocado no horário/dia/turma escolhido. Você pode selecionar múltiplos tempos de uma vez só (ex: a manhã inteira).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Professor com Restrição
                  </label>
                  <select
                    value={paramTeacherId}
                    onChange={(e) => {
                      setParamTeacherId(e.target.value);
                      if (!editingRuleId && e.target.value) {
                        const tea = activeWeek.teachers.find((t) => t.id === e.target.value);
                        if (tea) {
                          setRuleName(`Proibição de Horário: Prof. ${tea.shortName || tea.name}`);
                        }
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    <option value="">Qualquer Professor (ou todos)</option>
                    {activeWeek.teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.shortName || t.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Disciplina Proibida
                  </label>
                  <select
                    value={paramSubjectId}
                    onChange={(e) => {
                      setParamSubjectId(e.target.value);
                      if (!editingRuleId && e.target.value && !paramTeacherId) {
                        const sub = activeWeek.subjects.find((s) => s.id === e.target.value);
                        if (sub) {
                          setRuleName(`Proibição de Horário: ${sub.name}`);
                        }
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    <option value="">Qualquer Disciplina (ou todas)</option>
                    {activeWeek.subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.shortName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Turma Aplicável
                  </label>
                  <select
                    value={paramClassId}
                    onChange={(e) => setParamClassId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    <option value="">Todas as Turmas</option>
                    {displayClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Dia da Semana Aplicável
                  </label>
                  <select
                    value={paramDay}
                    onChange={(e) => setParamDay(e.target.value as DayOfWeek)}
                    className="w-full sm:w-1/3 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    <option value="">Todos os Dias da Semana</option>
                    {activeWeek.activeDays.map((d) => (
                      <option key={d} value={d}>
                        {DAYS_OF_WEEK.find((dw) => dw.key === d)?.label || d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Multi-slot selection with presets */}
                <div className="sm:col-span-3 space-y-2 bg-white/70 p-3 rounded-lg border border-rose-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[11px] font-bold text-slate-800">
                      Tempos / Horários Proibidos (Seleção Múltipla)
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => {
                          const morningEnd = activeWeek.shiftRanges?.morningEnd || '12:30';
                          const morningSlots = lessonSlots
                            .filter((s) => s.startTime < morningEnd)
                            .map((s) => s.id);
                          setParamSlotIds(morningSlots);
                        }}
                        className="px-2 py-0.5 bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 rounded-md font-semibold cursor-pointer"
                      >
                        ☀️ Toda a Manhã
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const afternoonStart = activeWeek.shiftRanges?.afternoonStart || '12:30';
                          const nightStart = activeWeek.shiftRanges?.nightStart || '18:30';
                          const afternoonSlots = lessonSlots
                            .filter((s) => s.startTime >= afternoonStart && s.startTime < nightStart)
                            .map((s) => s.id);
                          setParamSlotIds(afternoonSlots);
                        }}
                        className="px-2 py-0.5 bg-orange-100 text-orange-900 hover:bg-orange-200 border border-orange-300 rounded-md font-semibold cursor-pointer"
                      >
                        🌤️ Toda a Tarde
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nightStart = activeWeek.shiftRanges?.nightStart || '18:30';
                          const nightSlots = lessonSlots
                            .filter((s) => s.startTime >= nightStart)
                            .map((s) => s.id);
                          setParamSlotIds(nightSlots);
                        }}
                        className="px-2 py-0.5 bg-indigo-100 text-indigo-900 hover:bg-indigo-200 border border-indigo-300 rounded-md font-semibold cursor-pointer"
                      >
                        🌙 Toda a Noite
                      </button>
                      <button
                        type="button"
                        onClick={() => setParamSlotIds(lessonSlots.map((s) => s.id))}
                        className="px-2 py-0.5 bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300 rounded-md font-semibold cursor-pointer"
                      >
                        ✅ Todos os Tempos
                      </button>
                      <button
                        type="button"
                        onClick={() => setParamSlotIds([])}
                        className="px-2 py-0.5 bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300 rounded-md font-semibold cursor-pointer"
                      >
                        ❌ Limpar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-1">
                    {lessonSlots.map((slot) => {
                      const isSelected = paramSlotIds.includes(slot.id);
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setParamSlotIds(paramSlotIds.filter((id) => id !== slot.id));
                            } else {
                              setParamSlotIds([...paramSlotIds, slot.id]);
                            }
                          }}
                          className={`p-2 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50 hover:border-rose-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{slot.name}</span>
                            <span
                              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                isSelected ? 'bg-white text-rose-600' : 'border border-slate-300'
                              }`}
                            >
                              {isSelected ? '✓' : ''}
                            </span>
                          </div>
                          <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-rose-100' : 'text-slate-500'}`}>
                            {slot.startTime}–{slot.endTime}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {paramSlotIds.length === 0 && (
                    <p className="text-[10px] text-slate-500 italic mt-1">
                      Nenhum tempo específico selecionado (aplica-se a todos os tempos se deixado vazio).
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* FIXED SLOT PARAMETERS */}
          {ruleType === 'fixed_slot' && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Pin className="w-4 h-4 text-emerald-600" />
                <span>Configurar Horário Fixo Obrigatório</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Fixa uma disciplina e/ou professor permanentemente em uma turma, dia e horário específico. Ao gerar a grade, esta posição será travada automaticamente.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Turma <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={paramClassId}
                    onChange={(e) => setParamClassId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    <option value="">Selecione a Turma</option>
                    {displayClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Dia da Semana <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={paramDay}
                    onChange={(e) => setParamDay(e.target.value as DayOfWeek)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    <option value="">Selecione o Dia</option>
                    {activeWeek.activeDays.map((d) => (
                      <option key={d} value={d}>
                        {DAYS_OF_WEEK.find((dw) => dw.key === d)?.label || d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Tempo / Horário <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={paramSlotId}
                    onChange={(e) => setParamSlotId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    <option value="">Selecione o Tempo</option>
                    {lessonSlots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.name} ({slot.startTime} – {slot.endTime})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Disciplina Fixada <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={paramSubjectId}
                    onChange={(e) => {
                      setParamSubjectId(e.target.value);
                      if (!editingRuleId && e.target.value) {
                        const sub = activeWeek.subjects.find((s) => s.id === e.target.value);
                        if (sub) {
                          setRuleName(`Fixar ${sub.name} no horário`);
                        }
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    <option value="">Selecione a Disciplina</option>
                    {activeWeek.subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.shortName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Professor Específico (Opcional)
                  </label>
                  <select
                    value={paramTeacherId}
                    onChange={(e) => setParamTeacherId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    <option value="">Professor Padrão / Qualquer Habilitado</option>
                    {activeWeek.teachers
                      .filter((t) => !paramSubjectId || t.subjectIds.includes(paramSubjectId))
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.shortName || t.name})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Mandatory vs Preference Switch */}
          <div className="p-3.5 bg-indigo-50/50 border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-900">Classificação da Regra</div>
              <div className="text-[11px] text-slate-500">
                {isMandatory
                  ? '🔒 Obrigatória: O gerador NUNCA violará esta regra. Erros de validação serão acusados em vermelho.'
                  : '⭐ Preferência: O gerador tentará cumprir o máximo possível e alertará como aviso amarelo.'}
              </div>
            </div>
            <div className="flex items-center bg-white p-1 rounded-lg border border-indigo-200 shrink-0">
              <button
                type="button"
                onClick={() => setIsMandatory(true)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                  isMandatory ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Obrigatória (Hard)
              </button>
              <button
                type="button"
                onClick={() => setIsMandatory(false)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                  !isMandatory ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Preferência (Soft)
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{editingRuleId ? 'Salvar Alterações' : 'Criar Regra'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Rules List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center justify-between">
          <span>
            Regras Ativas na Grade ({activeWeek.rules.filter((r) => r.isEnabled).length}/
            {activeWeek.rules.length})
          </span>
          <span className="text-[11px] text-slate-500 font-normal normal-case">
            Clique em <strong>Editar</strong> para alterar nome, parâmetros ou descrição
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {activeWeek.rules.map((rule) => {
            const isEditingThisDesc = inlineEditId === rule.id;

            const ruleSubject = rule.parameters?.subjectId
              ? activeWeek.subjects.find((s) => s.id === rule.parameters.subjectId)
              : null;
            const ruleTeacher = rule.parameters?.teacherId
              ? activeWeek.teachers.find((t) => t.id === rule.parameters.teacherId)
              : null;
            const ruleClass = rule.parameters?.classId
              ? activeWeek.classes.find((c) => c.id === rule.parameters.classId)
              : null;
            const ruleSlot = rule.parameters?.slotId
              ? activeWeek.generatedSlots.find((s) => s.id === rule.parameters.slotId)
              : null;

            return (
              <div
                key={rule.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                  rule.isEnabled ? 'bg-white' : 'bg-slate-50/70 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3 flex-1">
                  {/* Toggle Enabled Switch */}
                  <button
                    type="button"
                    onClick={() => toggleRule(rule.id)}
                    className={`w-10 h-6 rounded-full transition-colors relative shrink-0 mt-0.5 cursor-pointer ${
                      rule.isEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                    title={rule.isEnabled ? 'Clique para desativar' : 'Clique para ativar'}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform shadow-xs ${
                        rule.isEnabled ? 'left-5' : 'left-1'
                      }`}
                    />
                  </button>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{rule.name}</span>

                      {rule.type === 'teacher_no_double_booking' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200 flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-indigo-600" />
                          Lei Física
                        </span>
                      )}

                      {rule.type === 'shared_room' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200 flex items-center gap-1">
                          <DoorClosed className="w-3 h-3 text-indigo-600" />
                          Espaço Compartilhado
                        </span>
                      )}

                      {(rule.type === 'double_lesson_substitution' ||
                        rule.parameters?.isWeeklyException) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-600" />
                          Exceção da Semana
                        </span>
                      )}

                      {rule.type === 'forbidden_slot' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1">
                          <Ban className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>Horário Proibido</span>
                          {ruleSubject && <span>• {ruleSubject.shortName}</span>}
                          {ruleTeacher && <span>• Prof. {ruleTeacher.shortName || ruleTeacher.name}</span>}
                          {rule.parameters?.day && <span>({rule.parameters.day})</span>}
                          {rule.parameters?.slotIds && rule.parameters.slotIds.length > 0 ? (
                            <span>
                              [{rule.parameters.slotIds.length === lessonSlots.length
                                ? 'Todos os Tempos'
                                : rule.parameters.slotIds.length > 2
                                ? `${rule.parameters.slotIds.length} tempos`
                                : rule.parameters.slotIds
                                    .map((id) => activeWeek.generatedSlots.find((s) => s.id === id)?.name || id)
                                    .join(', ')}]
                            </span>
                          ) : (
                            ruleSlot && <span>[{ruleSlot.name}]</span>
                          )}
                        </span>
                      )}

                      {rule.type === 'fixed_slot' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                          <Pin className="w-3 h-3 text-emerald-600" />
                          Horário Fixo
                          {ruleSubject && ` • ${ruleSubject.shortName}`}
                          {ruleClass && ` em ${ruleClass.name}`}
                          {rule.parameters?.day && ` (${rule.parameters.day})`}
                          {ruleSlot && ` [${ruleSlot.name}]`}
                        </span>
                      )}

                      {rule.type === 'lunch_max_start_time' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          🍲 Início máx: {rule.parameters?.maxStartTime || '12:30'}
                        </span>
                      )}

                      {rule.type === 'lunch_max_end_time' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          🍲 Término máx: {rule.parameters?.maxEndTime || '13:30'}
                        </span>
                      )}

                      {/* Mandatory / Preference Badge Toggle */}
                      <button
                        type="button"
                        onClick={() =>
                          updateRule({ ...rule, isMandatory: !rule.isMandatory })
                        }
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition cursor-pointer ${
                          rule.isMandatory
                            ? 'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200'
                            : 'bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200'
                        }`}
                        title="Clique para alternar entre Obrigatória e Preferência"
                      >
                        {rule.isMandatory ? '🔒 Obrigatória' : '⭐ Preferência'}
                      </button>
                    </div>

                    {/* Rule Description with Inline Edit */}
                    {isEditingThisDesc ? (
                      <div className="flex items-center gap-2 mt-1.5">
                        <input
                          type="text"
                          value={inlineDescText}
                          onChange={(e) => setInlineDescText(e.target.value)}
                          placeholder="Digite a descrição da regra..."
                          className="flex-1 px-2.5 py-1 text-xs border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveInlineDesc(rule)}
                          className="px-2 py-1 text-xs font-bold text-white bg-indigo-600 rounded-lg shadow-2xs cursor-pointer"
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => setInlineEditId(null)}
                          className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 group/desc mt-1">
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {rule.description || 'Restrição configurada na grade.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setInlineEditId(rule.id);
                            setInlineDescText(rule.description || '');
                          }}
                          className="opacity-0 group-hover/desc:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                          title="Editar descrição da regra"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => handleOpenEdit(rule)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-slate-100 hover:bg-indigo-50 rounded-lg border border-slate-200 transition cursor-pointer"
                    title="Editar Regra e Parâmetros"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Excluir Regra"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

