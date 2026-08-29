import { WeekSchedule } from '../types';

export interface BackupValidationResult {
  isValid: boolean;
  error?: string;
  weeks?: WeekSchedule[];
  details?: {
    weekCount: number;
    firstWeekTitle?: string;
  };
}

/**
 * Validates whether a given raw JSON string or parsed object is a valid backup file
 * for the Grade Generator application.
 */
export function validateBackupJSON(rawInput: string | unknown): BackupValidationResult {
  if (!rawInput) {
    return {
      isValid: false,
      error: 'O arquivo está vazio ou não pôde ser lido.',
    };
  }

  let parsed: any;
  if (typeof rawInput === 'string') {
    try {
      parsed = JSON.parse(rawInput);
    } catch (e: any) {
      return {
        isValid: false,
        error: `O arquivo não é um JSON válido: ${e?.message || 'Erro de sintaxe JSON'}.`,
      };
    }
  } else {
    parsed = rawInput;
  }

  if (!parsed || (typeof parsed !== 'object' && !Array.isArray(parsed))) {
    return {
      isValid: false,
      error: 'Estrutura de dados inválida. O arquivo de backup deve conter um objeto ou lista de grades.',
    };
  }

  // Extract weeks candidate array
  let weeksList: any[] = [];
  if (Array.isArray(parsed)) {
    weeksList = parsed;
  } else if (parsed.weeks && Array.isArray(parsed.weeks)) {
    weeksList = parsed.weeks;
  } else if (parsed.id && (parsed.classes || parsed.grid || parsed.title)) {
    // Single week export
    weeksList = [parsed];
  } else {
    return {
      isValid: false,
      error: 'O arquivo não possui o formato de backup do Gerador de Grade (chave "weeks" ou lista de semanas ausente).',
    };
  }

  if (weeksList.length === 0) {
    return {
      isValid: false,
      error: 'O arquivo de backup não contém nenhuma semana cadastrada.',
    };
  }

  // Validate every week object in the backup
  for (let i = 0; i < weeksList.length; i++) {
    const w = weeksList[i];
    if (!w || typeof w !== 'object') {
      return {
        isValid: false,
        error: `A semana na posição ${i + 1} possui estrutura corrompida.`,
      };
    }

    if (!w.id || typeof w.id !== 'string') {
      return {
        isValid: false,
        error: `A semana ${i + 1} não possui identificador (id) válido.`,
      };
    }

    if (!w.title || typeof w.title !== 'string') {
      return {
        isValid: false,
        error: `A semana "${w.id}" não possui título válido.`,
      };
    }

    if (!Array.isArray(w.activeDays) || w.activeDays.length === 0) {
      return {
        isValid: false,
        error: `A semana "${w.title}" não possui dias da semana (activeDays) configurados.`,
      };
    }

    if (!Array.isArray(w.classes)) {
      return {
        isValid: false,
        error: `A semana "${w.title}" não possui lista de turmas (classes).`,
      };
    }

    if (!Array.isArray(w.subjects)) {
      return {
        isValid: false,
        error: `A semana "${w.title}" não possui lista de disciplinas (subjects).`,
      };
    }

    if (!Array.isArray(w.teachers)) {
      return {
        isValid: false,
        error: `A semana "${w.title}" não possui lista de professores (teachers).`,
      };
    }

    if (w.grid && typeof w.grid !== 'object') {
      return {
        isValid: false,
        error: `A semana "${w.title}" possui formato de grade (grid) corrompido.`,
      };
    }
  }

  return {
    isValid: true,
    weeks: weeksList as WeekSchedule[],
    details: {
      weekCount: weeksList.length,
      firstWeekTitle: weeksList[0]?.title,
    },
  };
}
