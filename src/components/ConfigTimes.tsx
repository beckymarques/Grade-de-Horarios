import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Sparkles,
  ArrowRight,
  Info,
  Calendar,
  Layers,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Lock,
  Utensils,
  Building2,
  Sun,
  CloudSun,
  Moon,
} from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';
import {
  DayTimeConfig,
  IntervalConfig,
  EventConfig,
  DayOfWeek,
  DAYS_OF_WEEK,
  ShiftRangeConfig,
  DEFAULT_SHIFT_RANGES,
} from '../types';
import { calculateTimeSlots, formatMinutesToTime, parseTimeToMinutes } from '../utils/timeCalculator';

export const ConfigTimes: React.FC = () => {
  const { activeWeek, updateTimeConfig, updateActiveWeek } = useSchedule();

  if (!activeWeek) return null;

  const [config, setConfig] = useState<DayTimeConfig>(activeWeek.timeConfig);
  const [activeDays, setActiveDays] = useState<DayOfWeek[]>(activeWeek.activeDays || ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']);
  const [institutionName, setInstitutionName] = useState<string>(activeWeek.institutionName || '');
  const [shiftRanges, setShiftRanges] = useState<ShiftRangeConfig>(
    activeWeek.shiftRanges || { ...DEFAULT_SHIFT_RANGES }
  );

  // Sync state if active week changes
  useEffect(() => {
    if (activeWeek) {
      setConfig(activeWeek.timeConfig);
      setActiveDays(activeWeek.activeDays || ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']);
      setInstitutionName(activeWeek.institutionName || '');
      setShiftRanges(activeWeek.shiftRanges || { ...DEFAULT_SHIFT_RANGES });
    }
  }, [activeWeek?.id]);

  // Ensure mandatory Lunch is always present in events
  useEffect(() => {
    const hasLunch = config.events.some((e) => e.isLunch || e.name.toLowerCase().includes('almoço'));
    if (!hasLunch) {
      const lunchEvent: EventConfig = {
        id: `evt_lunch_${Date.now()}`,
        name: 'Almoço',
        afterLessonNumber: Math.min(3, Math.max(1, Math.floor(config.targetLessonCount / 2))),
        durationMinutes: 60,
        isLunch: true,
      };
      setConfig((prev) => ({
        ...prev,
        events: [lunchEvent, ...prev.events],
      }));
    }
  }, []);

  // Live calculation results
  const calcResult = calculateTimeSlots(config);

  const handleApply = () => {
    updateTimeConfig(config);
    updateActiveWeek({
      activeDays,
      institutionName,
      shiftRanges,
    });
  };

  const handleToggleDay = (day: DayOfWeek) => {
    if (activeDays.includes(day)) {
      if (activeDays.length === 1) return; // Must have at least 1 day
      const updated = activeDays.filter((d) => d !== day);
      setActiveDays(updated);
      updateActiveWeek({ activeDays: updated });
    } else {
      const updated = [...activeDays, day];
      setActiveDays(updated);
      updateActiveWeek({ activeDays: updated });
    }
  };

  const handleSetFrequencyPreset = (preset: '1_sab' | '1_dom' | '1_seg' | '2_sab_dom' | '3_seg_qua_sex' | '5_seg_sex' | '6_seg_sab') => {
    let days: DayOfWeek[] = [];
    if (preset === '1_sab') days = ['SAB'];
    if (preset === '1_dom') days = ['DOM'];
    if (preset === '1_seg') days = ['SEG'];
    if (preset === '2_sab_dom') days = ['SAB', 'DOM'];
    if (preset === '3_seg_qua_sex') days = ['SEG', 'QUA', 'SEX'];
    if (preset === '5_seg_sex') days = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'];
    if (preset === '6_seg_sab') days = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

    setActiveDays(days);
    updateActiveWeek({ activeDays: days });
  };

  const handleAddInterval = () => {
    const newId = `int_${Date.now()}`;
    const newInterval: IntervalConfig = {
      id: newId,
      name: `Intervalo ${config.intervals.length + 1}`,
      afterLessonNumber: Math.min(3, config.targetLessonCount),
      durationMinutes: 15,
    };
    setConfig({
      ...config,
      intervals: [...config.intervals, newInterval],
    });
  };

  const handleRemoveInterval = (id: string) => {
    setConfig({
      ...config,
      intervals: config.intervals.filter((i) => i.id !== id),
    });
  };

  const handleUpdateInterval = (id: string, updates: Partial<IntervalConfig>) => {
    setConfig({
      ...config,
      intervals: config.intervals.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    });
  };

  const handleAddEvent = () => {
    const newId = `evt_${Date.now()}`;
    const newEvent: EventConfig = {
      id: newId,
      name: 'Orientação Acadêmica',
      afterLessonNumber: config.targetLessonCount,
      durationMinutes: 45,
    };
    setConfig({
      ...config,
      events: [...config.events, newEvent],
    });
  };

  const handleRemoveEvent = (id: string) => {
    const target = config.events.find((e) => e.id === id);
    if (target && (target.isLunch || target.name.toLowerCase().includes('almoço'))) {
      alert('A existência do almoço é obrigatória na grade de horários. Você pode ajustar sua duração e a posição em que ocorre, mas não removê-lo.');
      return;
    }
    setConfig({
      ...config,
      events: config.events.filter((e) => e.id !== id),
    });
  };

  const handleUpdateEvent = (id: string, updates: Partial<EventConfig>) => {
    setConfig({
      ...config,
      events: config.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    });
  };

  const handleMoveEvent = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= config.events.length) return;
    const reordered = [...config.events];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    setConfig({
      ...config,
      events: reordered,
    });
  };

  const handleMoveInterval = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= config.intervals.length) return;
    const reordered = [...config.intervals];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    setConfig({
      ...config,
      intervals: reordered,
    });
  };

  // Quick auto-fix actions for surplus/deficit
  const autoAdjustLessonDuration = () => {
    if (calcResult.slots.length > 0) {
      const lastSlot = calcResult.slots[calcResult.slots.length - 1];
      setConfig({
        ...config,
        endHour: lastSlot.endTime,
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Configuração dos Tempos & Frequência da Semana
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Defina a quantidade de dias na semana (ex: cursinho de 1 dia aos sábados), horários de início e fim, intervalos e eventos.
          </p>
        </div>

        <button
          id="btn_save_time_config"
          onClick={handleApply}
          className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition active:scale-95"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          Aplicar à Grade Semanal
        </button>
      </div>

      {/* INSTITUTION & SHIFT RANGES CARD */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            Identificação da Instituição & Faixas de Turnos
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Configure o nome da sua escola, cursinho ou projeto (para sair nos relatórios e exportações em PDF/Excel) e os limites de horário de cada turno.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Institution Name Input */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome da Escola / Curso / Projeto
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="Ex: Escola Estadual Modelo / Curso Preparatório"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-slate-50/50 hover:bg-white"
              />
            </div>
          </div>

          {/* Shift Ranges Configuration */}
          <div className="md:col-span-2 bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                Faixas de Horários por Turno (Manhã, Tarde e Noite)
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Utilizado para categorizar aulas e restrições de professores
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Morning Shift */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold">
                  <Sun className="w-4 h-4 text-amber-500" />
                  Turno Manhã
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <label className="block text-slate-500 text-[10px] font-medium">Início</label>
                    <input
                      type="time"
                      value={shiftRanges.morningStart}
                      onChange={(e) =>
                        setShiftRanges((prev) => ({ ...prev, morningStart: e.target.value }))
                      }
                      className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] font-medium">Fim</label>
                    <input
                      type="time"
                      value={shiftRanges.morningEnd}
                      onChange={(e) =>
                        setShiftRanges((prev) => ({ ...prev, morningEnd: e.target.value }))
                      }
                      className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Afternoon Shift */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center gap-1.5 text-orange-800 text-xs font-bold">
                  <CloudSun className="w-4 h-4 text-orange-500" />
                  Turno Tarde
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <label className="block text-slate-500 text-[10px] font-medium">Início</label>
                    <input
                      type="time"
                      value={shiftRanges.afternoonStart}
                      onChange={(e) =>
                        setShiftRanges((prev) => ({ ...prev, afternoonStart: e.target.value }))
                      }
                      className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] font-medium">Fim</label>
                    <input
                      type="time"
                      value={shiftRanges.afternoonEnd}
                      onChange={(e) =>
                        setShiftRanges((prev) => ({ ...prev, afternoonEnd: e.target.value }))
                      }
                      className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Night Shift */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center gap-1.5 text-indigo-900 text-xs font-bold">
                  <Moon className="w-4 h-4 text-indigo-600" />
                  Turno Noite
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <label className="block text-slate-500 text-[10px] font-medium">Início</label>
                    <input
                      type="time"
                      value={shiftRanges.nightStart}
                      onChange={(e) =>
                        setShiftRanges((prev) => ({ ...prev, nightStart: e.target.value }))
                      }
                      className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] font-medium">Fim</label>
                    <input
                      type="time"
                      value={shiftRanges.nightEnd}
                      onChange={(e) =>
                        setShiftRanges((prev) => ({ ...prev, nightEnd: e.target.value }))
                      }
                      className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FREQUENCY / DAYS SELECTOR CARD */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Frequência Semanal do Cursinho (Dias de Aula)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Selecione quantos e quais dias terão aulas nesta semana (ex: 1 dia por semana = 1 grade gerada).
            </p>
          </div>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 self-start sm:self-auto">
            {activeDays.length === 1
              ? `1 dia por semana (${DAYS_OF_WEEK.find((d) => d.key === activeDays[0])?.label})`
              : `${activeDays.length} dias por semana`}
          </span>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="text-xs font-semibold text-slate-500 self-center mr-1">Atalhos:</span>
          <button
            type="button"
            onClick={() => handleSetFrequencyPreset('1_sab')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
              activeDays.length === 1 && activeDays[0] === 'SAB'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            1x/semana (Sábado)
          </button>
          <button
            type="button"
            onClick={() => handleSetFrequencyPreset('1_dom')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
              activeDays.length === 1 && activeDays[0] === 'DOM'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            1x/semana (Domingo)
          </button>
          <button
            type="button"
            onClick={() => handleSetFrequencyPreset('2_sab_dom')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
              activeDays.length === 2 && activeDays.includes('SAB') && activeDays.includes('DOM')
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            2x/semana (Fim de Semana)
          </button>
          <button
            type="button"
            onClick={() => handleSetFrequencyPreset('3_seg_qua_sex')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
              activeDays.length === 3 && activeDays.includes('SEG') && activeDays.includes('QUA') && activeDays.includes('SEX')
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            3x/semana (Seg/Qua/Sex)
          </button>
          <button
            type="button"
            onClick={() => handleSetFrequencyPreset('5_seg_sex')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
              activeDays.length === 5 && !activeDays.includes('SAB') && !activeDays.includes('DOM')
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            5x/semana (Seg a Sex)
          </button>
          <button
            type="button"
            onClick={() => handleSetFrequencyPreset('6_seg_sab')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
              activeDays.length === 6 && activeDays.includes('SAB') && !activeDays.includes('DOM')
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            6x/semana (Seg a Sáb)
          </button>
        </div>

        {/* Days Checkbox Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-2 border-t border-slate-100">
          {DAYS_OF_WEEK.map((day) => {
            const isChecked = activeDays.includes(day.key);
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => handleToggleDay(day.key)}
                className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                  isChecked
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-bold shadow-2xs'
                    : 'bg-slate-50/50 border-slate-200 text-slate-400 hover:border-slate-300'
                }`}
              >
                <span className="text-xs">{day.label}</span>
                <span className="text-[10px] font-semibold opacity-75 mt-0.5">
                  {isChecked ? '✓ Ativo' : 'Desativado'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Calculator Status Banner */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          calcResult.status === 'exact'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : calcResult.status === 'surplus'
            ? 'bg-blue-50 border-blue-200 text-blue-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}
      >
        <div className="flex items-start gap-3">
          {calcResult.status === 'exact' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="text-xs font-bold">
              {calcResult.status === 'exact'
                ? 'Distribuição Perfeita dos Horários'
                : calcResult.status === 'surplus'
                ? 'Sobram Minutos no Turno'
                : 'Faltam Minutos (Turno Estourado)'}
            </div>
            <p className="text-xs mt-0.5 opacity-90">
              {calcResult.warningMessage ||
                `Cada aula terá exatamente ${calcResult.lessonDurationMinutes} minutos, preenchendo 100% da janela das ${config.startHour} às ${config.endHour}.`}
            </p>
            {calcResult.suggestedAction && (
              <div className="text-[11px] font-medium mt-1 underline">
                {calcResult.suggestedAction}
              </div>
            )}
          </div>
        </div>

        {calcResult.status !== 'exact' && (
          <button
            onClick={autoAdjustLessonDuration}
            className="px-3.5 py-1.5 text-xs font-semibold bg-white rounded-lg shadow-2xs border border-slate-300 hover:bg-slate-50 shrink-0 text-slate-800"
          >
            Ajustar Horário Final Automaticamente
          </button>
        )}
      </div>

      {/* 2-Column Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form Settings */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main Time Range */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              1. Horário do Turno & Quantidade de Aulas
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Hora de Início
                </label>
                <input
                  type="time"
                  value={config.startHour}
                  onChange={(e) => setConfig({ ...config, startHour: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Hora de Término
                </label>
                <input
                  type="time"
                  value={config.endHour}
                  onChange={(e) => setConfig({ ...config, endHour: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Número de Aulas / Tempos por Dia
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={config.targetLessonCount}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      targetLessonCount: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Duração Resultante por Aula
                </label>
                <div className="px-3 py-2 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
                  {calcResult.lessonDurationMinutes} minutos / aula
                </div>
              </div>
            </div>

            {/* Duração por Aula: Calculada vs Fixa (Exceção) */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <label className="block text-xs font-bold text-slate-800">
                Regra de Duração das Aulas
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, useCustomLessonDuration: false })}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    !config.useCustomLessonDuration
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-2xs font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>Calculada Automaticamente</span>
                    {!config.useCustomLessonDuration && (
                      <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded">Padrão</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Divide o tempo disponível pelo número de aulas ({calcResult.lessonDurationMinutes} min/aula).
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setConfig({
                      ...config,
                      useCustomLessonDuration: true,
                      customLessonDuration: config.customLessonDuration || calcResult.lessonDurationMinutes || 50,
                    })
                  }
                  className={`p-2.5 rounded-xl border text-left transition ${
                    config.useCustomLessonDuration
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-2xs font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>Fixar Duração Específica</span>
                    {config.useCustomLessonDuration && (
                      <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded">Exceção</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Fixa uma duração exata (ex: 45 ou 50 min) independente da janela total.
                  </div>
                </button>
              </div>

              {config.useCustomLessonDuration && (
                <div className="pt-2 flex items-center gap-3 border-t border-slate-200">
                  <label className="text-xs font-medium text-slate-700 whitespace-nowrap">
                    Duração Fixa por Aula:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={10}
                      max={180}
                      step={5}
                      value={config.customLessonDuration || 50}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          customLessonDuration: Math.max(10, parseInt(e.target.value) || 50),
                        })
                      }
                      className="w-24 px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-600 font-semibold">minutos / aula</span>
                  </div>
                </div>
              )}
            </div>

            {/* Rounding Mode Toggle */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-slate-800">
                  Arredondar Horários para Múltiplos de 5 min (:00, :05, :10...)
                </div>
                <div className="text-[11px] text-slate-500">
                  Evita horários quebrados como 07:47 ou 08:33.
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.roundToFiveMinutes}
                onChange={(e) => setConfig({ ...config, roundToFiveMinutes: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500 border-slate-300"
              />
            </div>
          </div>

          {/* Intervals Block */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  2. Intervalos / Recreios
                </h3>
                <p className="text-[11px] text-slate-500">
                  Configure quantos intervalos ocorrem no dia e a duração de cada um.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddInterval}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Intervalo
              </button>
            </div>

            {config.intervals.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                Nenhum intervalo cadastrado. Aulas serão consecutivas.
              </div>
            ) : (
              <div className="space-y-3">
                {config.intervals.map((interval, idx) => (
                  <div
                    key={interval.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                  >
                    <div className="sm:col-span-1 flex items-center justify-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleMoveInterval(idx, 'up')}
                        disabled={idx === 0}
                        title="Mover para cima"
                        className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-25 rounded-md hover:bg-slate-200 transition"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveInterval(idx, 'down')}
                        disabled={idx === config.intervals.length - 1}
                        title="Mover para baixo"
                        className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-25 rounded-md hover:bg-slate-200 transition"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={interval.name}
                        onChange={(e) => handleUpdateInterval(interval.id, { name: e.target.value })}
                        placeholder="Nome do intervalo"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <select
                        value={interval.afterLessonNumber}
                        onChange={(e) =>
                          handleUpdateInterval(interval.id, {
                            afterLessonNumber: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        {Array.from({ length: config.targetLessonCount }).map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            Após {i + 1}ª aula
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-3 flex items-center gap-1">
                      <input
                        type="number"
                        min={5}
                        max={90}
                        step={5}
                        value={interval.durationMinutes}
                        onChange={(e) =>
                          handleUpdateInterval(interval.id, {
                            durationMinutes: parseInt(e.target.value) || 15,
                          })
                        }
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                      <span className="text-xs text-slate-500">min</span>
                    </div>
                    <div className="sm:col-span-1 text-right">
                      <button
                        onClick={() => handleRemoveInterval(interval.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Events / Lunch / Orientação Block */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  3. Eventos & Almoço / Orientação
                </h3>
                <p className="text-[11px] text-slate-500">
                  Blocos especiais no horário (Almoço, Orientação Acadêmica, Plantão). Reordene a sequência se desejar.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddEvent}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Evento
              </button>
            </div>

            {config.events.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                Nenhum evento extra cadastrado.
              </div>
            ) : (
              <div className="space-y-3">
                {config.events.map((event, idx) => {
                  const isLunchEvent = event.isLunch || event.name.toLowerCase().includes('almoço');

                  return (
                    <div
                      key={event.id}
                      className={`p-3 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-2 items-center ${
                        isLunchEvent
                          ? 'bg-amber-50/70 border border-amber-300'
                          : 'bg-blue-50/50 border border-blue-200'
                      }`}
                    >
                      <div className="sm:col-span-1 flex items-center justify-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleMoveEvent(idx, 'up')}
                          disabled={idx === 0}
                          title="Mover para cima"
                          className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-25 rounded-md hover:bg-blue-100 transition"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveEvent(idx, 'down')}
                          disabled={idx === config.events.length - 1}
                          title="Mover para baixo"
                          className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-25 rounded-md hover:bg-blue-100 transition"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="sm:col-span-4 flex items-center gap-1.5">
                        <input
                          type="text"
                          value={event.name}
                          onChange={(e) => handleUpdateEvent(event.id, { name: e.target.value })}
                          placeholder="Nome do evento"
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                        />
                        {isLunchEvent && (
                          <span
                            title="A existência do almoço é obrigatória"
                            className="inline-flex items-center gap-0.5 text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
                          >
                            <Utensils className="w-3 h-3" />
                            Obrigatório
                          </span>
                        )}
                      </div>
                      <div className="sm:col-span-3">
                        <select
                          value={event.afterLessonNumber}
                          onChange={(e) =>
                            handleUpdateEvent(event.id, {
                              afterLessonNumber: parseInt(e.target.value),
                            })
                          }
                          className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                        >
                          {Array.from({ length: config.targetLessonCount }).map((_, i) => (
                            <option key={i + 1} value={i + 1}>
                              Após {i + 1}ª aula
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-3 flex items-center gap-1">
                        <input
                          type="number"
                          min={15}
                          max={180}
                          step={5}
                          value={event.durationMinutes}
                          onChange={(e) =>
                            handleUpdateEvent(event.id, {
                              durationMinutes: parseInt(e.target.value) || 30,
                            })
                          }
                          className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                        />
                        <span className="text-xs text-slate-500 font-medium">min</span>
                      </div>
                      <div className="sm:col-span-1 text-right">
                        {isLunchEvent ? (
                          <span
                            title="O almoço é obrigatório e não pode ser excluído"
                            className="inline-block p-1.5 text-amber-600 bg-amber-100/70 rounded-lg cursor-not-allowed"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRemoveEvent(event.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                            title="Excluir evento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Timeline Slots Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs sticky top-24">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
              <span>Linhas de Horário Geradas</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                {calcResult.slots.length} tempos
              </span>
            </h3>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {calcResult.slots.map((slot, index) => {
                const isInterval = slot.type === 'interval';
                const isEvent = slot.type === 'event';

                return (
                  <div
                    key={slot.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
                      isInterval
                        ? 'bg-amber-50 border-amber-200 text-amber-900 font-semibold'
                        : isEvent
                        ? 'bg-blue-50 border-blue-200 text-blue-900 font-semibold'
                        : 'bg-white border-slate-200 text-slate-800 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[11px] ${
                          isInterval
                            ? 'bg-amber-200 text-amber-900'
                            : isEvent
                            ? 'bg-blue-200 text-blue-900'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {slot.slotNumber > 0 ? slot.slotNumber : '—'}
                      </div>
                      <div>
                        <div className="font-bold">{slot.name}</div>
                        <div className="text-[11px] opacity-75">{slot.durationMinutes} minutos</div>
                      </div>
                    </div>

                    <div className="text-right font-mono font-bold text-xs">
                      {slot.startTime} – {slot.endTime}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Total no dia: {calcResult.usedMinutes} minutos</span>
              <span>Janela: {calcResult.totalWindowMinutes} min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
