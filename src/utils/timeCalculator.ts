import { DayTimeConfig, TimeSlot } from '../types';

export interface TimeCalculationResult {
  slots: TimeSlot[];
  lessonDurationMinutes: number;
  totalWindowMinutes: number;
  usedMinutes: number;
  differenceMinutes: number; // >0 means surplus (gap), <0 means deficit (overflow)
  status: 'exact' | 'surplus' | 'deficit';
  warningMessage?: string;
  suggestedAction?: string;
}

export function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatMinutesToTime(totalMinutes: number): string {
  const normalized = Math.max(0, Math.floor(totalMinutes));
  const h = Math.floor(normalized / 60) % 24;
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function calculateTimeSlots(config: DayTimeConfig): TimeCalculationResult {
  const startMin = parseTimeToMinutes(config.startHour);
  const endMin = parseTimeToMinutes(config.endHour);
  let totalWindowMinutes = endMin - startMin;
  if (totalWindowMinutes <= 0) {
    totalWindowMinutes += 24 * 60; // overnight fallback
  }

  const totalIntervalsMinutes = config.intervals.reduce((acc, i) => acc + (Number(i.durationMinutes) || 0), 0);
  const totalEventsMinutes = config.events.reduce((acc, e) => acc + (Number(e.durationMinutes) || 0), 0);
  const availableForLessons = totalWindowMinutes - totalIntervalsMinutes - totalEventsMinutes;

  const lessonCount = Math.max(1, config.targetLessonCount || 6);

  let rawLessonDuration = availableForLessons / lessonCount;
  let finalLessonDuration = rawLessonDuration;

  if (config.useCustomLessonDuration && config.customLessonDuration && config.customLessonDuration > 0) {
    // User explicitly fixed a custom lesson duration as an exception
    finalLessonDuration = config.customLessonDuration;
  } else if (config.roundToFiveMinutes) {
    // Round to nearest 5 minutes
    finalLessonDuration = Math.round(rawLessonDuration / 5) * 5;
    if (finalLessonDuration <= 0) finalLessonDuration = 5;
  } else {
    finalLessonDuration = Math.floor(rawLessonDuration);
  }

  // Now let's construct the actual chronological slots
  const slots: TimeSlot[] = [];
  let currentMin = startMin;

  // Track lesson number (1-based)
  let currentLessonNum = 1;

  while (currentLessonNum <= lessonCount) {
    // Check if any event is scheduled BEFORE this lesson or if after previous lesson
    // First, add the lesson
    const lessonStart = currentMin;
    const lessonEnd = lessonStart + finalLessonDuration;
    slots.push({
      id: `lesson_${currentLessonNum}`,
      slotNumber: currentLessonNum,
      type: 'lesson',
      name: `${currentLessonNum}º Tempo`,
      startTime: formatMinutesToTime(lessonStart),
      endTime: formatMinutesToTime(lessonEnd),
      durationMinutes: finalLessonDuration,
    });
    currentMin = lessonEnd;

    // Check intervals configured after this lesson
    const matchingIntervals = config.intervals.filter((i) => i.afterLessonNumber === currentLessonNum);
    for (const interval of matchingIntervals) {
      const dur = Number(interval.durationMinutes) || 15;
      slots.push({
        id: `interval_${interval.id}`,
        slotNumber: 0,
        type: 'interval',
        name: interval.name || 'Intervalo',
        startTime: formatMinutesToTime(currentMin),
        endTime: formatMinutesToTime(currentMin + dur),
        durationMinutes: dur,
      });
      currentMin += dur;
    }

    // Check events configured after this lesson
    const matchingEvents = config.events.filter((e) => e.afterLessonNumber === currentLessonNum);
    for (const event of matchingEvents) {
      const dur = Number(event.durationMinutes) || 30;
      slots.push({
        id: `event_${event.id}`,
        slotNumber: 0,
        type: 'event',
        name: event.name || 'Evento Especial',
        startTime: formatMinutesToTime(currentMin),
        endTime: formatMinutesToTime(currentMin + dur),
        durationMinutes: dur,
      });
      currentMin += dur;
    }

    currentLessonNum++;
  }

  const usedMinutes = currentMin - startMin;
  const differenceMinutes = totalWindowMinutes - usedMinutes;

  let status: 'exact' | 'surplus' | 'deficit' = 'exact';
  let warningMessage: string | undefined;
  let suggestedAction: string | undefined;

  if (differenceMinutes > 0) {
    status = 'surplus';
    warningMessage = `Sobram ${differenceMinutes} minutos no dia (o horário termina às ${config.endHour}, mas a última atividade termina às ${formatMinutesToTime(currentMin)}).`;
    suggestedAction = `Sugestão: Aumente o tempo de aula em ~${Math.floor(differenceMinutes / lessonCount)} min ou ajuste o horário final para ${formatMinutesToTime(currentMin)}.`;
  } else if (differenceMinutes < 0) {
    status = 'deficit';
    warningMessage = `Faltam ${Math.abs(differenceMinutes)} minutos no dia (a grade ultrapassa o horário final de ${config.endHour}, terminando às ${formatMinutesToTime(currentMin)}).`;
    suggestedAction = `Sugestão: Reduza os intervalos/eventos em ${Math.abs(differenceMinutes)} min ou diminua o tempo de aula.`;
  }

  return {
    slots,
    lessonDurationMinutes: finalLessonDuration,
    totalWindowMinutes,
    usedMinutes,
    differenceMinutes,
    status,
    warningMessage,
    suggestedAction,
  };
}
