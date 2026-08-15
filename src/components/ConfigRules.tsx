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
} from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';
import { DayOfWeek, DAYS_OF_WEEK, RuleType, ScheduleRule } from '../types';

export const ConfigRules: React.FC = () => {
  const { activeWeek, addRule, updateRule, deleteRule, toggleRule } = useSchedule();

  const [isAdding, setIsAdding] = useState(false);

  // New Rule Form
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState<RuleType>('double_lesson_substitution');
  const [isMandatory, setIsMandatory] = useState(true);
  const [description, setDescription] = useState('');

  // Parametric selectors
  const [paramTeacherId, setParamTeacherId] = useState('');
  const [paramSubstituteTeacherId, setParamSubstituteTeacherId] = useState('');
  const [paramSubjectId, setParamSubjectId] = useState('');
  const [paramClassId, setParamClassId] = useState('');
  const [paramDay, setParamDay] = useState<DayOfWeek>('SEG');
  const [paramSlotId, setParamSlotId] = useState('lesson_1');
  const [paramMaxConsecutive, setParamMaxConsecutive] = useState(2);
  const [paramReason, setParamReason] = useState('Falta de professor titular - reposição com aulas dobradas');
  const [paramLunchMaxStart, setParamLunchMaxStart] = useState('12:30');
  const [paramLunchMaxEnd, setParamLunchMaxEnd] = useState('13:30');

  if (!activeWeek) return null;

  const resetForm = () => {
    setIsAdding(false);
    setRuleName('');
    setRuleType('no_consecutive_heavy_subjects');
    setIsMandatory(true);
    setDescription('');
    setParamTeacherId('');
    setParamSubstituteTeacherId('');
    setParamSubjectId('');
    setParamClassId('');
    setParamDay(activeWeek.activeDays[0] || 'SEG');
    setParamSlotId('lesson_1');
    setParamMaxConsecutive(2);
    setParamReason('');
    setParamLunchMaxStart('12:30');
    setParamLunchMaxEnd('13:30');
  };

  const handleOpenDoubleLessonPreset = () => {
    setIsAdding(true);
    setRuleType('double_lesson_substitution');
    setRuleName('Exceção: Dobrar aulas de disciplina por falta de professor');
    setIsMandatory(true);
    setDescription('Autoriza tempos geminados/dobrados para suprir ausência ou intensivo');
    setParamDay(activeWeek.activeDays[0] || 'SEG');
    setParamMaxConsecutive(2);
    setParamReason('Falta de professor / Dobra emergencial');
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    const isException = ruleType === 'double_lesson_substitution';

    const newRule: ScheduleRule = {
      id: `rule_${Date.now()}`,
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
        day: paramDay || undefined,
        slotId: paramSlotId || undefined,
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

    addRule(newRule);
    resetForm();
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
            As regras mudam toda semana. Você pode ligar/desligar, alternar entre <strong>Obrigatória</strong> (o gerador nunca viola) ou <strong>Preferência</strong> (tenta cumprir e avisa se não deu), e criar regras sob medida.
          </p>
        </div>

        {!isAdding && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              id="btn_add_double_lesson_exception"
              onClick={handleOpenDoubleLessonPreset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl shadow-xs transition"
            >
              <Zap className="w-4 h-4 text-amber-600 shrink-0" />
              <span>⚡ Exceção: Dobrar Aula (Falta Prof)</span>
            </button>
            <button
              id="btn_add_rule"
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Nova Regra Parametrizada</span>
            </button>
          </div>
        )}
      </div>

      {/* Add Rule Form */}
      {isAdding && (
        <form
          onSubmit={handleCreateRule}
          className="bg-white p-5 rounded-2xl border-2 border-indigo-200 shadow-sm space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-2">
              {ruleType === 'double_lesson_substitution' && <Zap className="w-4 h-4 text-amber-500" />}
              {ruleType === 'double_lesson_substitution'
                ? 'Registrar Exceção: Dobrar Aulas por Falta de Professor'
                : 'Cadastrar Nova Regra Parametrizada'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nome Descritivo da Regra / Exceção *
              </label>
              <input
                type="text"
                required
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="Ex: Dobrar Matemática no Sábado devido à falta de Química..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tipo de Restrição
              </label>
              <select
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value as RuleType)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
              >
                <option value="double_lesson_substitution">⚡ Exceção da Semana: Dobrar Aulas (Falta de Professor / Intensivo)</option>
                <option value="lunch_max_start_time">🍲 Almoço: Deve começar no máximo até determinado horário</option>
                <option value="lunch_max_end_time">🍲 Almoço: Deve terminar no máximo até determinado horário</option>
                <option value="no_duplicate_subject_same_day">Disciplina não repete no mesmo dia para mesma turma</option>
                <option value="no_consecutive_heavy_subjects">Duas disciplinas pesadas não podem ficar seguidas</option>
                <option value="forbidden_slot">Disciplina ou Professor proibido em horário específico</option>
                <option value="fixed_slot">Disciplina/Prof fixo em um tempo/turma específico (Trava)</option>
                <option value="max_consecutive_teacher">Máximo de aulas seguidas do mesmo professor</option>
                <option value="shared_room">Sala Compartilhada (professores não simultâneos)</option>
                <option value="teacher_absence">Professor ausente no dia/tempo</option>
                <option value="exact_load_match">Exigir cumprimento exato da carga horária</option>
                <option value="custom_rule">Regra livre personalizada</option>
              </select>
            </div>
          </div>

          {/* Double Lesson Substitution Parameter Box */}
          {ruleType === 'double_lesson_substitution' && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-600" />
                Parâmetros da Exceção de Aula Dobrada
              </div>
              <p className="text-[11px] text-amber-800">
                O gerador agrupará 2 ou mais tempos seguidos desta disciplina na mesma turma e não acusará infração de matéria repetida no dia.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Disciplina a Dobrar *
                  </label>
                  <select
                    value={paramSubjectId}
                    onChange={(e) => setParamSubjectId(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Selecione a disciplina...</option>
                    {activeWeek.subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Professor que Dobrará / Substituto
                  </label>
                  <select
                    value={paramTeacherId}
                    onChange={(e) => setParamTeacherId(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Professor Padrão da Matéria</option>
                    {activeWeek.teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Turma Afetada
                  </label>
                  <select
                    value={paramClassId}
                    onChange={(e) => setParamClassId(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Todas as Turmas</option>
                    {activeWeek.classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Dia da Semana
                  </label>
                  <select
                    value={paramDay}
                    onChange={(e) => setParamDay(e.target.value as DayOfWeek)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {activeWeek.activeDays.map((k) => (
                      <option key={k} value={k}>
                        {DAYS_OF_WEEK.find((d) => d.key === k)?.label || k}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Quantidade de Aulas Consecutivas (Tempos Seguidos)
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={4}
                    value={paramMaxConsecutive}
                    onChange={(e) => setParamMaxConsecutive(parseInt(e.target.value) || 2)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Motivo da Exceção
                  </label>
                  <input
                    type="text"
                    value={paramReason}
                    onChange={(e) => setParamReason(e.target.value)}
                    placeholder="Ex: Falta de professor titular / reposição de conteúdo"
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Parameters according to Type */}
          {(ruleType === 'forbidden_slot' || ruleType === 'fixed_slot') && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Disciplina</label>
                <select
                  value={paramSubjectId}
                  onChange={(e) => setParamSubjectId(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Qualquer Disciplina</option>
                  {activeWeek.subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Professor</label>
                <select
                  value={paramTeacherId}
                  onChange={(e) => setParamTeacherId(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Qualquer Professor</option>
                  {activeWeek.teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Dia da Semana</label>
                <select
                  value={paramDay}
                  onChange={(e) => setParamDay(e.target.value as DayOfWeek)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.key} value={d.key}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Tempo / Horário</label>
                <select
                  value={paramSlotId}
                  onChange={(e) => setParamSlotId(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  {activeWeek.generatedSlots.filter((s) => s.type === 'lesson').map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.startTime})</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {ruleType === 'lunch_max_start_time' && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <span>🍲 Limite de Início do Almoço</span>
              </div>
              <p className="text-[11px] text-amber-800">
                O evento obrigatório de Almoço não poderá começar após este horário (ex: almoçar no máximo até as 12:30).
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
                      if (!ruleName || ruleName.startsWith('Almoço deve começar')) {
                        setRuleName(`Almoço deve começar no máximo às ${e.target.value}`);
                      }
                    }}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                  />
                </div>
                <div className="flex items-center gap-1.5 pt-4">
                  {['11:40', '12:00', '12:30', '13:00'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setParamLunchMaxStart(preset);
                        setRuleName(`Almoço deve começar no máximo às ${preset}`);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition ${
                        paramLunchMaxStart === preset
                          ? 'bg-amber-600 text-white border-amber-600'
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
                      if (!ruleName || ruleName.startsWith('Almoço deve terminar')) {
                        setRuleName(`Almoço deve terminar no máximo às ${e.target.value}`);
                      }
                    }}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                  />
                </div>
                <div className="flex items-center gap-1.5 pt-4">
                  {['13:00', '13:30', '14:00', '14:30'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setParamLunchMaxEnd(preset);
                        setRuleName(`Almoço deve terminar no máximo às ${preset}`);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition ${
                        paramLunchMaxEnd === preset
                          ? 'bg-amber-600 text-white border-amber-600'
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
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl max-w-xs">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Máximo de Tempos Consecutivos
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={paramMaxConsecutive}
                onChange={(e) => setParamMaxConsecutive(parseInt(e.target.value) || 3)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          )}

          {/* Mandatory vs Preference Switch */}
          <div className="p-3.5 bg-indigo-50/50 border border-indigo-200 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900">
                Classificação da Regra
              </div>
              <div className="text-[11px] text-slate-500">
                {isMandatory
                  ? '🔒 Obrigatória: O gerador NUNCA violará esta regra. Se for impossível, ele avisa o motivo exato.'
                  : '⭐ Preferência: O gerador tentará cumprir o máximo possível e alertará caso precise flexibilizar.'}
              </div>
            </div>
            <div className="flex items-center bg-white p-1 rounded-lg border border-indigo-200 shrink-0">
              <button
                type="button"
                onClick={() => setIsMandatory(true)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  isMandatory
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Obrigatória (Hard)
              </button>
              <button
                type="button"
                onClick={() => setIsMandatory(false)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  !isMandatory
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
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
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
            >
              Salvar Regra
            </button>
          </div>
        </form>
      )}

      {/* Rules List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center justify-between">
          <span>Regras Ativas na Grade ({activeWeek.rules.filter((r) => r.isEnabled).length}/{activeWeek.rules.length})</span>
          <span className="text-[11px] text-slate-500 font-normal normal-case">
            Clique no interruptor para ativar/desativar
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {activeWeek.rules.map((rule) => {
            return (
              <div
                key={rule.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                  rule.isEnabled ? 'bg-white' : 'bg-slate-50/70 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleRule(rule.id)}
                    className={`w-10 h-6 rounded-full transition-colors relative shrink-0 mt-0.5 ${
                      rule.isEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform shadow-xs ${
                        rule.isEnabled ? 'left-5' : 'left-1'
                      }`}
                    />
                  </button>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{rule.name}</span>
                      {(rule.type === 'double_lesson_substitution' || rule.parameters.isWeeklyException) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-600" />
                          Exceção da Semana
                        </span>
                      )}
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

                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {rule.description || 'Restrição configurada na grade.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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
