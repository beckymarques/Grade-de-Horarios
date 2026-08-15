import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  DayOfWeek,
  DAYS_OF_WEEK,
  GridCell,
  TimeSlot,
  WeekSchedule,
} from '../types';
import { validateSchedule } from './rulesEngine';

export function exportScheduleToExcel(week: WeekSchedule) {
  const { title, activeDays, generatedSlots, classes, subjects, teachers, loads, rules, grid } = week;
  const validation = validateSchedule(grid, activeDays, generatedSlots, classes, subjects, teachers, rules, loads);

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));

  // Build Sheet 1: Grade Semanal
  const rows: any[][] = [];

  // Title header
  rows.push([title.toUpperCase()]);
  rows.push([`Período: ${week.dateRange}`, `Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`]);
  rows.push([]); // blank line

  for (const dayKey of activeDays) {
    const dayMeta = DAYS_OF_WEEK.find((d) => d.key === dayKey);
    const dayTitle = dayMeta ? dayMeta.label.toUpperCase() : dayKey;

    // Day Header Banner
    rows.push([`=== ${dayTitle} ===`]);

    // Table Header
    const headerRow = ['Horário', 'Tempo / Atividade'];
    for (const cls of classes) {
      headerRow.push(cls.name);
    }
    headerRow.push('Tutores em Janela (Disponíveis)');
    headerRow.push('Avisos & Validações');
    rows.push(headerRow);

    // Rows for each time slot
    for (const slot of generatedSlots) {
      const timeStr = `${slot.startTime} - ${slot.endTime}`;
      const rowData: string[] = [timeStr, slot.name];

      if (slot.type === 'interval' || slot.type === 'event') {
        // Interval or lunch event
        const bannerText = `--- ${slot.name.toUpperCase()} (${slot.durationMinutes} min) ---`;
        for (let i = 0; i < classes.length; i++) {
          rowData.push(bannerText);
        }
        rowData.push('-');
        rowData.push('✓');
      } else {
        // Lesson slot
        for (const cls of classes) {
          const key = `${dayKey}_${slot.id}_${cls.id}`;
          const cell = grid[key];
          if (cell && cell.subjectId) {
            const sub = subjectMap.get(cell.subjectId);
            const tea = cell.teacherId ? teacherMap.get(cell.teacherId) : null;
            const subName = sub ? sub.name : 'Disciplina';
            const teaName = tea ? ` [Prof. ${tea.shortName || tea.name}]` : '';
            rowData.push(`${subName}${teaName}`);
          } else {
            rowData.push('---');
          }
        }

        // Window tutors column for this slot
        const tutorsInSlot = validation.windowTutors
          .filter((w) => w.day === dayKey && w.slotId === slot.id)
          .map((w) => w.teacherName);
        rowData.push(tutorsInSlot.length > 0 ? tutorsInSlot.join(', ') : 'Nenhum');

        // Conflicts in this slot
        const slotConflicts = validation.conflicts.filter(
          (c) => c.day === dayKey && c.slotId === slot.id
        );
        if (slotConflicts.length > 0) {
          const conflictMsgs = slotConflicts.map((c) => `⚠️ ${c.message}`).join(' | ');
          rowData.push(conflictMsgs);
        } else {
          rowData.push('✓ Sem conflitos');
        }
      }

      rows.push(rowData);
    }

    rows.push([]); // blank separator
  }

  // Build Sheet 2: Carga Horária e Cumprimento
  const loadRows: any[][] = [];
  loadRows.push(['RELATÓRIO DE CARGA HORÁRIA SEMANAL']);
  loadRows.push(['Turma', 'Disciplina', 'Meta Semanal', 'Alocado na Grade', 'Saldo', 'Status']);

  for (const item of validation.loadSummary) {
    let statusText = 'OK (Meta Atingida)';
    if (item.difference < 0) statusText = `Faltam ${Math.abs(item.difference)} aulas`;
    if (item.difference > 0) statusText = `Excesso de ${item.difference} aulas`;

    loadRows.push([
      item.className,
      item.subjectName,
      item.target,
      item.actual,
      item.difference,
      statusText,
    ]);
  }

  // Build Sheet 3: Professores e Regras
  const teacherRows: any[][] = [];
  teacherRows.push(['CORPO DOCENTE E RESTRIÇÕES']);
  teacherRows.push(['Nome', 'Nome Curto', 'Disciplinas', 'Sala Compartilhada', 'Faltas Registradas', 'Max Aulas Seguidas']);

  for (const t of teachers) {
    const subs = t.subjectIds.map((sid) => subjectMap.get(sid)?.shortName || sid).join(', ');
    const absences = t.absences && t.absences.length > 0
      ? t.absences.map((a) => `${a.day} ${a.allDay ? '(Dia todo)' : ''}`).join('; ')
      : 'Nenhuma';

    teacherRows.push([
      t.name,
      t.shortName,
      subs,
      t.sharedRoomId || 'Nenhuma',
      absences,
      t.maxConsecutiveLessons || 3,
    ]);
  }

  // Create workbook
  const wb = XLSX.utils.book_new();

  const wsGrade = XLSX.utils.aoa_to_sheet(rows);
  // Auto-width columns
  wsGrade['!cols'] = [
    { wch: 16 }, // Horário
    { wch: 20 }, // Tempo
    ...classes.map(() => ({ wch: 26 })), // Turmas
    { wch: 30 }, // Tutores em janela
    { wch: 40 }, // Conflitos
  ];
  XLSX.utils.book_append_sheet(wb, wsGrade, 'Grade Semanal');

  const wsLoads = XLSX.utils.aoa_to_sheet(loadRows);
  wsLoads['!cols'] = [{ wch: 16 }, { wch: 26 }, { wch: 14 }, { wch: 16 }, { wch: 10 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsLoads, 'Carga Horária');

  const wsTeachers = XLSX.utils.aoa_to_sheet(teacherRows);
  wsTeachers['!cols'] = [{ wch: 24 }, { wch: 14 }, { wch: 26 }, { wch: 20 }, { wch: 26 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsTeachers, 'Professores');

  // Trigger file download
  const safeFilename = `Grade_${week.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, safeFilename);
}

export async function exportScheduleToPNG(elementId: string, filename: string = 'grade_semanal.png') {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function exportScheduleToPDF(elementId: string, title: string = 'Grade Semanal') {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pdfWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let position = 10;
  pdf.addImage(imgData, 'PNG', 10, position, imgWidth, Math.min(imgHeight, pdfHeight - 20));

  pdf.save(`Grade_${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
}

export function exportBackupJSON(allWeeks: WeekSchedule[]) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allWeeks, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `backup_grades_prevestibular_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
