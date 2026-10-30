import React, { useState } from 'react';
import {
  Wand2,
  Clock,
  Utensils,
  Sun,
  Sunset,
  Moon,
  Calendar,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Layers,
  Sliders,
  Coffee,
} from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';
import {
  DayTimeConfig,
  IntervalConfig,
  EventConfig,
  DayOfWeek,
  ShiftRangeConfig,
  DEFAULT_SHIFT_RANGES,
} from '../types';
import { calculateTimeSlots, formatMinutesToTime, parseTimeToMinutes } from '../utils/timeCalculator';

interface TimesWizardModalProps {
  onClose: () => void;
}

type SchoolShiftType = 'morning_only' | 'afternoon_only' | 'night_only' | 'full_day' | 'custom';

export const TimesWizardModal: React.FC<TimesWizardModalProps> = ({ onClose }) => {
  const { activeWeek, updateTimeConfig, updateActiveWeek } = useSchedule();

  const [step, setStep] = useState<number>(1);

  // Form State
  const [shiftType, setShiftType] = useState<SchoolShiftType>('morning_only');
  const [startHour, setStartHour] = useState<string>('07:00');
  const [lessonCount, setLessonCount] = useState<number>(6);
  const [lessonDuration, setLessonDuration] = useState<number>(50);

  // Interval & Meal options
  const [hasMorningBreak, setHasMorningBreak] = useState<boolean>(true);
  const [morningBreakDuration, setMorningBreakDuration] = useState<number>(20);
  const [morningBreakAfterLesson, setMorningBreakAfterLesson] = useState<number>(2);

  // Lunch (Opcional - pode habilitar ou desabilitar)
  const [hasLunch, setHasLunch] = useState<boolean>(false);
  const [lunchDuration, setLunchDuration] = useState<number>(60);
  const [lunchAfterLesson, setLunchAfterLesson] = useState<number>(3);

  // Afternoon Break
  const [hasAfternoonBreak, setHasAfternoonBreak] = useState<boolean>(false);
  const [afternoonBreakDuration, setAfternoonBreakDuration] = useState<number>(15);
  const [afternoonBreakAfterLesson, setAfternoonBreakAfterLesson] = useState<number>(5);

  // Dinner (Jantar - opcional como o almoço)
  const [hasDinner, setHasDinner] = useState<boolean>(false);
  const [dinnerDuration, setDinnerDuration] = useState<number>(45);
  const [dinnerAfterLesson, setDinnerAfterLesson] = useState<number>(6);

  // Days
  const [activeDays, setActiveDays] = useState<DayOfWeek[]>(['SEG', 'TER', 'QUA', 'QUI', 'SEX']);

  // Handle Preset Selection
  const handleSelectShiftType = (type: SchoolShiftType) => {
    setShiftType(type);
    if (type === 'morning_only') {
      setStartHour('07:00');
      setLessonCount(5);
      setLessonDuration(50);
      setHasMorningBreak(true);
      setMorningBreakDuration(20);
      setMorningBreakAfterLesson(2);
      setHasLunch(false); // Só 1 turno: sem almoço
      setHasAfternoonBreak(false);
      setHasDinner(false);
    } else if (type === 'afternoon_only') {
      setStartHour('13:15');
      setLessonCount(5);
      setLessonDuration(50);
      setHasMorningBreak(false);
      setHasLunch(false); // Turno da tarde: sem almoço na escola
      setHasAfternoonBreak(true);
      setAfternoonBreakDuration(20);
      setAfternoonBreakAfterLesson(2);
      setHasDinner(false);
    } else if (type === 'night_only') {
      setStartHour('19:00');
      setLessonCount(4);
      setLessonDuration(45);
      setHasMorningBreak(false);
      setHasLunch(false);
      setHasAfternoonBreak(false);
      setHasDinner(false); // Sem jantar na grade (ou opcional)
    } else if (type === 'full_day') {
      setStartHour('07:30');
      setLessonCount(8);
      setLessonDuration(50);
      setHasMorningBreak(true);
      setMorningBreakDuration(15);
      setMorningBreakAfterLesson(3);
      setHasLunch(true); // Integral: COM almoço
      setLunchDuration(60);
      setLunchAfterLesson(4);
      setHasAfternoonBreak(true);
      setAfternoonBreakDuration(15);
      setAfternoonBreakAfterLesson(6);
      setHasDinner(false);
    }
  };

  // Build the live configuration
  const buildConfig = (): DayTimeConfig => {
    const intervals: IntervalConfig[] = [];
    const events: EventConfig[] = [];

    if (hasMorningBreak) {
      intervals.push({
        id: 'int_morning',
        name: 'Recreio / Intervalo Matutino',
        afterLessonNumber: Math.min(morningBreakAfterLesson, lessonCount),
        durationMinutes: morningBreakDuration,
      });
    }

    if (hasLunch) {
      events.push({
        id: 'evt_lunch',
        name: 'Almoço',
        afterLessonNumber: Math.min(lunchAfterLesson, lessonCount),
        durationMinutes: lunchDuration,
        isLunch: true,
        isEnabled: true,
      });
    }

    if (hasAfternoonBreak) {
      intervals.push({
        id: 'int_afternoon',
        name: 'Recreio / Intervalo Vespertino',
        afterLessonNumber: Math.min(afternoonBreakAfterLesson, lessonCount),
        durationMinutes: afternoonBreakDuration,
      });
    }

    if (hasDinner) {
      events.push({
        id: 'evt_dinner',
        name: 'Jantar',
        afterLessonNumber: Math.min(dinnerAfterLesson, lessonCount),
        durationMinutes: dinnerDuration,
        isDinner: true,
        isEnabled: true,
      });
    }

    // Calculate dynamic end hour
    let totalMinutes = parseTimeToMinutes(startHour);
    totalMinutes += lessonCount * lessonDuration;
    if (hasMorningBreak) totalMinutes += morningBreakDuration;
    if (hasLunch) totalMinutes += lunchDuration;
    if (hasAfternoonBreak) totalMinutes += afternoonBreakDuration;
    if (hasDinner) totalMinutes += dinnerDuration;

    return {
      startHour,
      endHour: formatMinutesToTime(totalMinutes),
      targetLessonCount: lessonCount,
      intervals,
      events,
      roundToFiveMinutes: true,
      useCustomLessonDuration: true,
      customLessonDuration: lessonDuration,
      hasLunch,
      lunchDurationMinutes: lunchDuration,
      lunchAfterLesson,
      hasDinner,
      dinnerDurationMinutes: dinnerDuration,
      dinnerAfterLesson,
    };
  };

  const currentPreviewConfig = buildConfig();
  const previewSlots = calculateTimeSlots(currentPreviewConfig);

  const handleApply = () => {
    updateTimeConfig(currentPreviewConfig);
    updateActiveWeek({
      activeDays,
    });
    onClose();
  };

  const toggleDay = (day: DayOfWeek) => {
    if (activeDays.includes(day)) {
      if (activeDays.length > 1) {
        setActiveDays(activeDays.filter((d) => d !== day));
      }
    } else {
      setActiveDays([...activeDays, day]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Wand2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Assistente de Configuração de Horários
              </h3>
              <p className="text-xs text-slate-500">
                Passo {step} de 4 • Configure turnos, aulas, almoço e jantar facilmente
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

        {/* Steps Breadcrumbs */}
        <div className="flex items-center justify-between py-3 border-b border-slate-100 text-xs font-semibold text-slate-500 shrink-0">
          <div className={`flex items-center gap-1.5 ${step === 1 ? 'text-indigo-600 font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200'}`}>1</span>
            <span>Turno</span>
          </div>
          <span className="text-slate-300">→</span>
          <div className={`flex items-center gap-1.5 ${step === 2 ? 'text-indigo-600 font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200'}`}>2</span>
            <span>Aulas</span>
          </div>
          <span className="text-slate-300">→</span>
          <div className={`flex items-center gap-1.5 ${step === 3 ? 'text-indigo-600 font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200'}`}>3</span>
            <span>Almoço/Jantar</span>
          </div>
          <span className="text-slate-300">→</span>
          <div className={`flex items-center gap-1.5 ${step === 4 ? 'text-indigo-600 font-bold' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 4 ? 'bg-indigo-600 text-white' : 'bg-slate-200'}`}>4</span>
            <span>Prévia</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          
          {/* STEP 1: SHIFT SELECTION */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Qual é o funcionamento principal da sua escola?
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selecione o modelo mais próximo para carregar configurações recomendadas.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Manhã Apenas */}
                <button
                  type="button"
                  onClick={() => handleSelectShiftType('morning_only')}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    shiftType === 'morning_only'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 text-amber-600 mb-1">
                    <Sun className="w-5 h-5" />
                    <span className="font-bold text-sm text-slate-900">Apenas Manhã</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Aulas das 07:00 às 11:30 ou 12:30. <strong>Sem almoço na escola</strong> (apenas recreio matutino).
                  </p>
                </button>

                {/* 2. Tarde Apenas */}
                <button
                  type="button"
                  onClick={() => handleSelectShiftType('afternoon_only')}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    shiftType === 'afternoon_only'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 text-orange-600 mb-1">
                    <Sunset className="w-5 h-5" />
                    <span className="font-bold text-sm text-slate-900">Apenas Tarde</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Aulas das 13:15 às 17:45. Recreio vespertino, <strong>sem necessidade de almoço ou jantar</strong>.
                  </p>
                </button>

                {/* 3. Noite Apenas */}
                <button
                  type="button"
                  onClick={() => handleSelectShiftType('night_only')}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    shiftType === 'night_only'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 text-indigo-700 mb-1">
                    <Moon className="w-5 h-5" />
                    <span className="font-bold text-sm text-slate-900">Apenas Noite (EJA / Cursinho)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Aulas das 19:00 às 22:30. 4 tempos compactos para estudantes trabalhadores.
                  </p>
                </button>

                {/* 4. Período Integral */}
                <button
                  type="button"
                  onClick={() => handleSelectShiftType('full_day')}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    shiftType === 'full_day'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 text-emerald-600 mb-1">
                    <Sparkles className="w-5 h-5" />
                    <span className="font-bold text-sm text-slate-900">Período Integral (Manhã + Tarde)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Aulas das 07:30 às 17:00, <strong>com Almoço obrigatório de 60 min</strong> e 2 recreios.
                  </p>
                </button>
              </div>

              {/* Days selection */}
              <div className="pt-2">
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Dias Letivos da Semana:
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'] as DayOfWeek[]).map((d) => {
                    const isSelected = activeDays.includes(d);
                    const labelMap: Record<string, string> = {
                      SEG: 'Segunda',
                      TER: 'Terça',
                      QUA: 'Quarta',
                      QUI: 'Quinta',
                      SEX: 'Sexta',
                      SAB: 'Sábado',
                      DOM: 'Domingo',
                    };
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(d)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {labelMap[d]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: LESSON TIMES & DURATION */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Horário de Início e Duração das Aulas
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Defina a que horas bate o primeiro sinal e a duração de cada tempo.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Início da 1ª Aula:
                  </label>
                  <input
                    type="time"
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                    className="w-full text-sm font-bold text-slate-900 p-2 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Duração de Cada Aula:
                  </label>
                  <select
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(Number(e.target.value))}
                    className="w-full text-sm font-bold text-slate-900 p-2 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={40}>40 minutos</option>
                    <option value={45}>45 minutos</option>
                    <option value={50}>50 minutos (Padrão)</option>
                    <option value={55}>55 minutos</option>
                    <option value={60}>60 minutos (1 hora)</option>
                  </select>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Quantidade de Aulas/Dia:
                  </label>
                  <select
                    value={lessonCount}
                    onChange={(e) => setLessonCount(Number(e.target.value))}
                    className="w-full text-sm font-bold text-slate-900 p-2 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={4}>4 tempos</option>
                    <option value={5}>5 tempos</option>
                    <option value={6}>6 tempos</option>
                    <option value={7}>7 tempos</option>
                    <option value={8}>8 tempos</option>
                    <option value={9}>9 tempos</option>
                    <option value={10}>10 tempos</option>
                  </select>
                </div>
              </div>

              {/* Explanation tip */}
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 text-xs text-indigo-900 leading-relaxed">
                💡 <strong>Dica do Gerador:</strong> Com {lessonCount} tempos de {lessonDuration} minutos, os alunos terão {lessonCount * lessonDuration} minutos totais de conteúdo por dia letivo.
              </div>
            </div>
          )}

          {/* STEP 3: MEALS (ALMOÇO E JANTAR) & INTERVALS */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Refeições e Intervalos (Totalmente Opcionais)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ative ou desative o almoço e o jantar de acordo com a rotina da sua escola.
                </p>
              </div>

              <div className="space-y-3">
                
                {/* 1. Almoço Opcional */}
                <div className={`p-4 rounded-2xl border transition ${hasLunch ? 'bg-amber-50/60 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${hasLunch ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        <Utensils className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-900">🍽️ Horário de Almoço</span>
                        <p className="text-xs text-slate-500">
                          Desative caso sua escola funcione em apenas um turno (manhã ou tarde).
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasLunch}
                        onChange={(e) => setHasLunch(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>

                  {hasLunch && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-amber-200 text-xs animate-in fade-in">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Duração do Almoço:</label>
                        <select
                          value={lunchDuration}
                          onChange={(e) => setLunchDuration(Number(e.target.value))}
                          className="w-full p-1.5 font-bold bg-white rounded-lg border border-amber-300"
                        >
                          <option value={45}>45 minutos</option>
                          <option value={50}>50 minutos</option>
                          <option value={60}>60 minutos (1 hora)</option>
                          <option value={75}>75 minutos (1h 15m)</option>
                          <option value={90}>90 minutos (1h 30m)</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Ocorre após qual aula?</label>
                        <select
                          value={lunchAfterLesson}
                          onChange={(e) => setLunchAfterLesson(Number(e.target.value))}
                          className="w-full p-1.5 font-bold bg-white rounded-lg border border-amber-300"
                        >
                          {Array.from({ length: lessonCount - 1 }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              Após a {n}ª Aula
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Jantar Opcional */}
                <div className={`p-4 rounded-2xl border transition ${hasDinner ? 'bg-indigo-50/60 border-indigo-300' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${hasDinner ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        <Moon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-900">🍲 Horário de Jantar</span>
                        <p className="text-xs text-slate-500">
                          Opcional para escolas de tempo integral estendido ou turno noturno.
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasDinner}
                        onChange={(e) => setHasDinner(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {hasDinner && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-indigo-200 text-xs animate-in fade-in">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Duração do Jantar:</label>
                        <select
                          value={dinnerDuration}
                          onChange={(e) => setDinnerDuration(Number(e.target.value))}
                          className="w-full p-1.5 font-bold bg-white rounded-lg border border-indigo-300"
                        >
                          <option value={30}>30 minutos</option>
                          <option value={40}>40 minutos</option>
                          <option value={45}>45 minutos</option>
                          <option value={50}>50 minutos</option>
                          <option value={60}>60 minutos (1 hora)</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Ocorre após qual aula?</label>
                        <select
                          value={dinnerAfterLesson}
                          onChange={(e) => setDinnerAfterLesson(Number(e.target.value))}
                          className="w-full p-1.5 font-bold bg-white rounded-lg border border-indigo-300"
                        >
                          {Array.from({ length: lessonCount - 1 }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              Após a {n}ª Aula
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Recreio / Intervalo Matutino */}
                <div className={`p-4 rounded-2xl border transition ${hasMorningBreak ? 'bg-sky-50/60 border-sky-300' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${hasMorningBreak ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        <Coffee className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-900">☕ Recreio / Intervalo Curto</span>
                        <p className="text-xs text-slate-500">Pausa para lanche e descanso dos alunos e professores.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasMorningBreak}
                        onChange={(e) => setHasMorningBreak(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                  </div>

                  {hasMorningBreak && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-sky-200 text-xs animate-in fade-in">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Duração do Intervalo:</label>
                        <select
                          value={morningBreakDuration}
                          onChange={(e) => setMorningBreakDuration(Number(e.target.value))}
                          className="w-full p-1.5 font-bold bg-white rounded-lg border border-sky-300"
                        >
                          <option value={10}>10 minutos</option>
                          <option value={15}>15 minutos</option>
                          <option value={20}>20 minutos (Padrão)</option>
                          <option value={25}>25 minutos</option>
                          <option value={30}>30 minutos</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Após qual aula?</label>
                        <select
                          value={morningBreakAfterLesson}
                          onChange={(e) => setMorningBreakAfterLesson(Number(e.target.value))}
                          className="w-full p-1.5 font-bold bg-white rounded-lg border border-sky-300"
                        >
                          {Array.from({ length: lessonCount - 1 }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              Após a {n}ª Aula
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* STEP 4: PREVIEW & APPLY */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Pré-visualização da Sua Grade de Horários
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verifique como ficará a distribuição cronológica antes de aplicar.
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                <div className="bg-indigo-50 border border-indigo-200 p-2.5 rounded-xl">
                  <div className="text-indigo-600 font-bold">Início / Término</div>
                  <div className="text-sm font-black text-indigo-950 mt-0.5">
                    {currentPreviewConfig.startHour} às {currentPreviewConfig.endHour}
                  </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                  <div className="text-emerald-700 font-bold">Total de Aulas</div>
                  <div className="text-sm font-black text-emerald-950 mt-0.5">
                    {lessonCount} tempos ({lessonDuration}m cada)
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                  <div className="text-amber-700 font-bold">Almoço & Jantar</div>
                  <div className="text-xs font-black text-amber-950 mt-1">
                    {hasLunch ? '🍽️ Almoço Ativo' : 'Sem almoço'} • {hasDinner ? '🍲 Jantar Ativo' : 'Sem jantar'}
                  </div>
                </div>
              </div>

              {/* Slots List Preview */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-2.5">Horário</th>
                      <th className="p-2.5">Atividade</th>
                      <th className="p-2.5">Duração</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewSlots.slots.map((s, idx) => (
                      <tr
                        key={idx}
                        className={`${
                          s.type === 'lesson'
                            ? 'bg-white'
                            : s.name.toLowerCase().includes('almoço')
                            ? 'bg-amber-50 font-bold text-amber-900'
                            : s.name.toLowerCase().includes('jantar')
                            ? 'bg-indigo-50 font-bold text-indigo-900'
                            : 'bg-sky-50 font-medium text-sky-900'
                        }`}
                      >
                        <td className="p-2 font-mono font-bold whitespace-nowrap">
                          {s.startTime} - {s.endTime}
                        </td>
                        <td className="p-2 font-semibold">
                          {s.type === 'lesson' ? `📖 ${s.name}` : `✨ ${s.name}`}
                        </td>
                        <td className="p-2 text-slate-500 whitespace-nowrap">
                          {s.durationMinutes} min
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-3.5 border-t border-slate-100 shrink-0">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                <span>Avançar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApply}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>Aplicar na Grade Agora</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
