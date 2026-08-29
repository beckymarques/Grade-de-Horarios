import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import {
  DayOfWeek,
  DAYS_OF_WEEK,
  GridCell,
  TimeSlot,
  WeekSchedule,
  TimetableLayoutTheme,
  getDisplayClasses,
} from '../types';
import { validateSchedule, resolveCellForClass } from './rulesEngine';

export interface ExportFilterOptions {
  selectedDays?: DayOfWeek[];
  separateZip?: boolean;
  includeTimestamp?: boolean; // Se deve incluir data e hora de emissão
  layoutTheme?: TimetableLayoutTheme; // Tema visual da grade exportada
}

/**
 * Sanitizes all unsupported CSS colors (oklab, oklch, color-mix, lab, lch) from the cloned document
 * to prevent html2canvas color parsing crashes.
 */
function sanitizeUnsupportedCssColors(clonedDoc: Document) {
  try {
    const convertColor = (colorStr: string): string => {
      if (!colorStr) return colorStr;
      if (
        !colorStr.includes('oklch') &&
        !colorStr.includes('oklab') &&
        !colorStr.includes('color-mix') &&
        !colorStr.includes('lab(') &&
        !colorStr.includes('lch(')
      ) {
        return colorStr;
      }

      return colorStr.replace(
        /(?:oklch|oklab|color-mix|lab|lch)\([^)]+\)/gi,
        '#6366f1'
      );
    };

    const styleTags = clonedDoc.querySelectorAll('style');
    styleTags.forEach((styleTag) => {
      if (styleTag.textContent) {
        styleTag.textContent = convertColor(styleTag.textContent);
      }
    });

    const allElements = clonedDoc.querySelectorAll('*');
    allElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.style) {
        const styleAttr = htmlEl.getAttribute('style');
        if (styleAttr) {
          htmlEl.setAttribute('style', convertColor(styleAttr));
        }
      }
    });
  } catch (e) {
    console.warn('Error during CSS color sanitization for html2canvas:', e);
  }
}

function getInitials(name?: string): string {
  if (!name) return 'PR';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Creates a pristine, fully-styled, standalone HTML element for exporting
 * specific or all active days of the schedule according to the chosen layoutTheme.
 */
function createExportableScheduleElement(
  week: WeekSchedule,
  daysToRender?: DayOfWeek[],
  options?: ExportFilterOptions
): HTMLElement {
  const { title, dateRange, activeDays, generatedSlots, classes, subjects, teachers, loads, rules, grid, institutionName } = week;
  const targetDays = daysToRender && daysToRender.length > 0 ? daysToRender : activeDays;
  const validation = validateSchedule(grid, activeDays, generatedSlots, classes, subjects, teachers, rules, loads);
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const displayClasses = getDisplayClasses(classes);
  const lessonSlotsCount = generatedSlots.filter((s) => s.type === 'lesson').length;
  const showTimestamp = options?.includeTimestamp !== false;
  const theme: TimetableLayoutTheme = options?.layoutTheme || 'classic_table';

  const isSchoolBoard = theme === 'school_board';
  const isModernCards = theme === 'modern_cards';
  const isCompactDensity = theme === 'compact_density';

  const container = document.createElement('div');
  container.id = 'clean_exportable_schedule_root';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '-9999px';
  container.style.width = '1400px';
  container.style.backgroundColor = isSchoolBoard ? '#0f172a' : isModernCards ? '#f8fafc' : '#ffffff';
  container.style.color = isSchoolBoard ? '#f8fafc' : '#0f172a';
  container.style.fontFamily = 'Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.padding = isCompactDensity ? '16px 20px' : '24px 28px';
  container.style.boxSizing = 'border-box';
  container.style.zIndex = '-9999';

  // Master Document Header
  const headerDiv = document.createElement('div');
  headerDiv.style.display = 'flex';
  headerDiv.style.justifyContent = 'space-between';
  headerDiv.style.alignItems = 'center';
  headerDiv.style.borderBottom = isSchoolBoard ? '2px solid #f59e0b' : '2px solid #4338ca';
  headerDiv.style.paddingBottom = isCompactDensity ? '10px' : '14px';
  headerDiv.style.marginBottom = isCompactDensity ? '14px' : '20px';

  headerDiv.innerHTML = `
    <div>
      ${institutionName ? `<div style="font-size: 13px; font-weight: 700; color: ${isSchoolBoard ? '#fbbf24' : '#4338ca'}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">${institutionName}</div>` : ''}
      <div style="font-size: 20px; font-weight: 800; color: ${isSchoolBoard ? '#f8fafc' : '#1e1b4b'}; text-transform: uppercase; letter-spacing: -0.5px;">
        ${title}
      </div>
      <div style="font-size: 12px; color: ${isSchoolBoard ? '#94a3b8' : '#475569'}; margin-top: 3px; font-weight: 500;">
        Período: <strong style="color: ${isSchoolBoard ? '#fbbf24' : '#0f172a'};">${dateRange || 'Semana Regular'}</strong>${showTimestamp ? ` • Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
      </div>
    </div>
    <div style="text-align: right; font-size: 11px; color: ${isSchoolBoard ? '#94a3b8' : '#64748b'};">
      <span style="display: inline-block; background-color: ${isSchoolBoard ? '#1e293b' : '#e0e7ff'}; color: ${isSchoolBoard ? '#fbbf24' : '#3730a3'}; padding: 4px 10px; border-radius: 6px; font-weight: 700; margin-right: 6px; border: ${isSchoolBoard ? '1px solid #334155' : 'none'};">
        ${displayClasses.length} Turmas
      </span>
      <span style="display: inline-block; background-color: ${isSchoolBoard ? '#1e293b' : '#f1f5f9'}; color: ${isSchoolBoard ? '#e2e8f0' : '#334155'}; padding: 4px 10px; border-radius: 6px; font-weight: 700; border: ${isSchoolBoard ? '1px solid #334155' : 'none'};">
        ${lessonSlotsCount} Tempos de Aula/Dia
      </span>
    </div>
  `;
  container.appendChild(headerDiv);

  // Render Each Active Day Table
  for (const dayKey of targetDays) {
    const dayMeta = DAYS_OF_WEEK.find((d) => d.key === dayKey);
    const dayLabel = dayMeta ? dayMeta.label.toUpperCase() : dayKey;

    const daySection = document.createElement('div');
    daySection.style.marginBottom = isCompactDensity ? '18px' : '28px';

    // Day Header Banner
    const dayBanner = document.createElement('div');
    dayBanner.style.backgroundColor = isSchoolBoard ? '#1e293b' : isModernCards ? '#312e81' : '#1e293b';
    dayBanner.style.color = isSchoolBoard ? '#fbbf24' : '#ffffff';
    dayBanner.style.padding = isCompactDensity ? '6px 12px' : '8px 14px';
    dayBanner.style.fontSize = isCompactDensity ? '11px' : '12px';
    dayBanner.style.fontWeight = '700';
    dayBanner.style.letterSpacing = '0.5px';
    dayBanner.style.borderRadius = '8px 8px 0 0';
    dayBanner.style.border = isSchoolBoard ? '1px solid #334155' : 'none';
    dayBanner.style.display = 'flex';
    dayBanner.style.justifyContent = 'space-between';
    dayBanner.innerHTML = `
      <span>📅 ${dayLabel}</span>
      <span style="color: ${isSchoolBoard ? '#94a3b8' : '#cbd5e1'}; font-weight: 400; font-size: 11px;">Grade de Horários & Aulas</span>
    `;
    daySection.appendChild(dayBanner);

    // Table
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = isCompactDensity ? '10px' : '11px';
    table.style.backgroundColor = isSchoolBoard ? '#0f172a' : isModernCards ? '#f8fafc' : '#ffffff';
    table.style.border = isSchoolBoard ? '1px solid #334155' : '1px solid #cbd5e1';

    // Thead
    const thead = document.createElement('thead');
    const headerTr = document.createElement('tr');
    headerTr.style.backgroundColor = isSchoolBoard ? '#1e293b' : isModernCards ? '#ffffff' : '#f8fafc';

    // Time Col Header
    const thTime = document.createElement('th');
    thTime.style.width = isCompactDensity ? '95px' : '110px';
    thTime.style.padding = isCompactDensity ? '6px 4px' : '8px 6px';
    thTime.style.border = isSchoolBoard ? '1px solid #334155' : '1px solid #cbd5e1';
    thTime.style.color = isSchoolBoard ? '#fbbf24' : '#334155';
    thTime.style.fontWeight = '700';
    thTime.style.textAlign = 'center';
    thTime.textContent = 'Horário / Tempo';
    headerTr.appendChild(thTime);

    // Class Columns
    for (const cls of displayClasses) {
      const thCls = document.createElement('th');
      thCls.style.padding = isCompactDensity ? '6px 6px' : '8px 8px';
      thCls.style.border = isSchoolBoard ? '1px solid #334155' : '1px solid #cbd5e1';
      thCls.style.borderTop = `3px solid ${cls.color || '#4f46e5'}`;
      thCls.style.backgroundColor = isSchoolBoard ? '#1e293b' : isModernCards ? '#ffffff' : '#f8fafc';
      thCls.style.color = isSchoolBoard ? '#f8fafc' : '#0f172a';
      thCls.style.fontWeight = '700';
      thCls.style.textAlign = 'center';
      thCls.innerHTML = `
        <div style="font-size: ${isCompactDensity ? '10px' : '11px'};">${cls.name}</div>
        ${cls.defaultRoom ? `<div style="font-size: 9px; color: ${isSchoolBoard ? '#94a3b8' : '#64748b'}; font-weight: 400;">${cls.defaultRoom}</div>` : ''}
      `;
      headerTr.appendChild(thCls);
    }

    // Window Tutors Column Header
    const thTutors = document.createElement('th');
    thTutors.style.width = isCompactDensity ? '170px' : '200px';
    thTutors.style.padding = isCompactDensity ? '6px 4px' : '8px 6px';
    thTutors.style.border = isSchoolBoard ? '1px solid #334155' : '1px solid #cbd5e1';
    thTutors.style.backgroundColor = isSchoolBoard ? '#78350f' : isModernCards ? '#fffbeb' : '#fef3c7';
    thTutors.style.color = isSchoolBoard ? '#fef3c7' : '#92400e';
    thTutors.style.fontWeight = '700';
    thTutors.style.textAlign = 'center';
    thTutors.textContent = 'Tutores em Janela';
    headerTr.appendChild(thTutors);

    thead.appendChild(headerTr);
    table.appendChild(thead);

    // Tbody
    const tbody = document.createElement('tbody');

    for (const slot of generatedSlots) {
      const tr = document.createElement('tr');
      const isInterval = slot.type === 'interval' || slot.type === 'event';

      if (isInterval) {
        tr.style.backgroundColor = isSchoolBoard ? '#1e293b' : '#f1f5f9';

        const tdTime = document.createElement('td');
        tdTime.style.padding = isCompactDensity ? '4px 3px' : '6px 4px';
        tdTime.style.border = isSchoolBoard ? '1px solid #334155' : '1px solid #e2e8f0';
        tdTime.style.textAlign = 'center';
        tdTime.style.fontWeight = '600';
        tdTime.style.color = isSchoolBoard ? '#94a3b8' : '#475569';
        tdTime.style.fontSize = '10px';
        tdTime.innerHTML = `<div>${slot.startTime} - ${slot.endTime}</div><div style="font-size: 9px; color: ${isSchoolBoard ? '#fbbf24' : '#64748b'};">${slot.name}</div>`;
        tr.appendChild(tdTime);

        const tdInterval = document.createElement('td');
        tdInterval.colSpan = displayClasses.length;
        tdInterval.style.padding = isCompactDensity ? '4px 8px' : '6px 10px';
        tdInterval.style.border = isSchoolBoard ? '1px solid #334155' : '1px solid #cbd5e1';
        tdInterval.style.textAlign = 'center';
        tdInterval.style.fontWeight = '700';
        tdInterval.style.color = isSchoolBoard ? '#f59e0b' : '#475569';
        tdInterval.style.fontSize = isCompactDensity ? '10px' : '11px';
        tdInterval.style.backgroundColor = isSchoolBoard ? '#1e293b' : '#f1f5f9';
        tdInterval.style.letterSpacing = '0.5px';
        tdInterval.textContent = `— ${slot.name.toUpperCase()} (${slot.durationMinutes} MIN) —`;
        tr.appendChild(tdInterval);

        const tdTutor = document.createElement('td');
        tdTutor.style.padding = isCompactDensity ? '4px' : '6px';
        tdTutor.style.border = isSchoolBoard ? '1px solid #334155' : '1px solid #e2e8f0';
        tdTutor.style.textAlign = 'center';
        tdTutor.style.color = isSchoolBoard ? '#64748b' : '#94a3b8';
        tdTutor.textContent = '—';
        tr.appendChild(tdTutor);
      } else {
        const tdTime = document.createElement('td');
        tdTime.style.padding = isCompactDensity ? '5px 3px' : '8px 4px';
        tdTime.style.border = isSchoolBoard ? '1px solid #334155' : '1px solid #e2e8f0';
        tdTime.style.textAlign = 'center';
        tdTime.style.backgroundColor = isSchoolBoard ? '#1e293b' : isModernCards ? '#ffffff' : '#f8fafc';
        tdTime.innerHTML = `
          <div style="font-weight: 700; color: ${isSchoolBoard ? '#f8fafc' : '#1e293b'}; font-size: ${isCompactDensity ? '10px' : '11px'};">${slot.startTime} - ${slot.endTime}</div>
          <div style="font-size: 10px; color: ${isSchoolBoard ? '#94a3b8' : '#64748b'}; margin-top: 1px;">${slot.name}</div>
        `;
        tr.appendChild(tdTime);

        for (const cls of displayClasses) {
          const tdCell = document.createElement('td');
          tdCell.style.padding = isCompactDensity ? '3px 4px' : '6px 8px';
          tdCell.style.border = isSchoolBoard ? '1px solid #334155' : '1px solid #e2e8f0';
          tdCell.style.verticalAlign = 'top';

          const cell = resolveCellForClass(grid, dayKey, slot.id, cls.id, classes);

          if (cell && cell.subjectId) {
            const sub = subjectMap.get(cell.subjectId);
            const teacher = cell.teacherId ? teacherMap.get(cell.teacherId) : null;
            const subName = sub ? sub.name : 'Disciplina';
            const subColor = sub?.color || '#4f46e5';

            if (isSchoolBoard) {
              // School Board Vibrant Style
              tdCell.innerHTML = `
                <div style="background-color: ${subColor}; border: 1px solid #334155; border-radius: 6px; padding: 5px 7px; color: #ffffff;">
                  <div style="font-weight: 800; color: #ffffff; font-size: 11px; line-height: 1.2; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                    ${subName}
                  </div>
                  ${
                    teacher
                      ? `<div style="display: inline-block; background-color: rgba(0,0,0,0.45); color: #ffffff; font-size: 9.5px; font-weight: 700; padding: 1.5px 5px; border-radius: 4px; margin-top: 3px;">
                          ${teacher.shortName || teacher.name}
                         </div>`
                      : ''
                  }
                </div>
              `;
            } else if (isModernCards) {
              // Modern Cards Style
              tdCell.innerHTML = `
                <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); padding: 5px 7px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                    <div style="font-weight: 800; color: #0f172a; font-size: 11px; line-height: 1.2;">
                      ${subName}
                    </div>
                    <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${subColor}; shrink-0; display: inline-block;"></span>
                  </div>
                  ${
                    teacher
                      ? `<div style="display: flex; align-items: center; gap: 4px; margin-top: 3px;">
                          <span style="width: 15px; height: 15px; border-radius: 50%; background-color: #e0e7ff; color: #4338ca; font-size: 8px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center;">
                            ${getInitials(teacher?.name)}
                          </span>
                          <span style="font-size: 10px; color: #334155; font-weight: 700;">
                            ${teacher.shortName || teacher.name}
                          </span>
                         </div>`
                      : ''
                  }
                </div>
              `;
            } else if (isCompactDensity) {
              // Compact Density Style
              tdCell.innerHTML = `
                <div style="background-color: #ffffff; border-left: 2.5px solid ${subColor}; padding: 2px 4px; border-top: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
                  <div style="font-weight: 700; color: #0f172a; font-size: 9.5px; line-height: 1.1;">
                    ${sub.shortName || subName}
                  </div>
                  ${
                    teacher
                      ? `<div style="font-size: 8.5px; color: #4338ca; font-weight: 600; margin-top: 1px;">
                          ${teacher.shortName || teacher.name}
                         </div>`
                      : ''
                  }
                </div>
              `;
            } else {
              // Classic Table Style
              tdCell.innerHTML = `
                <div style="background-color: #f8fafc; border-left: 3px solid ${subColor}; padding: 4px 6px; border-radius: 4px; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                  <div style="font-weight: 700; color: #0f172a; font-size: 11px; line-height: 1.2;">
                    ${subName}
                  </div>
                  ${
                    teacher
                      ? `<div style="font-size: 10px; color: #4338ca; font-weight: 600; margin-top: 2px;">
                          Prof. ${teacher.shortName || teacher.name}
                         </div>`
                      : ''
                  }
                </div>
              `;
            }
          } else {
            tdCell.innerHTML = `<div style="text-align: center; color: ${isSchoolBoard ? '#475569' : '#cbd5e1'}; font-size: 11px; padding: 4px;">—</div>`;
          }
          tr.appendChild(tdCell);
        }

        const tdTutors = document.createElement('td');
        tdTutors.style.padding = isCompactDensity ? '4px 5px' : '6px 8px';
        tdTutors.style.border = isSchoolBoard ? '1px solid #334155' : '1px solid #e2e8f0';
        tdTutors.style.backgroundColor = isSchoolBoard ? '#0f172a' : isModernCards ? '#ffffff' : '#fffbeb';
        tdTutors.style.verticalAlign = 'top';

        const tutorsInSlot = validation.windowTutors.filter(
          (w) => w.day === dayKey && w.slotId === slot.id
        );

        if (tutorsInSlot.length > 0) {
          tdTutors.innerHTML = `
            <div style="display: flex; flex-wrap: wrap; gap: 3px;">
              ${tutorsInSlot
                .map((tutor) => {
                  if (tutor.isAbsent) {
                    if (isSchoolBoard) {
                      return `<span style="background-color: #881337; color: #fecdd3; font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 4px; border: 1px solid #e11d48;">
                        ${tutor.teacherName} (ausente)
                      </span>`;
                    }
                    return `<span style="background-color: #ffe4e6; color: #9f1239; font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 4px; border: 1px solid #fecdd3;">
                      ${tutor.teacherName} (ausente)
                    </span>`;
                  }

                  if (isSchoolBoard) {
                    return `<span style="background-color: #fbbf24; color: #0f172a; font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 4px;">
                      ${tutor.teacherName}
                    </span>`;
                  }
                  if (isModernCards) {
                    return `<span style="background-color: #fef3c7; color: #92400e; font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 6px; border: 1px solid #fde68a;">
                      ${tutor.teacherName}
                    </span>`;
                  }
                  return `<span style="background-color: #fde68a; color: #92400e; font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 4px; border: 1px solid #fcd34d;">
                    ${tutor.teacherName}
                  </span>`;
                })
                .join('')}
            </div>
          `;
        } else {
          tdTutors.innerHTML = `<div style="text-align: center; color: ${isSchoolBoard ? '#64748b' : '#b45309'}; font-size: 10px; font-style: italic;">Nenhum tutor</div>`;
        }
        tr.appendChild(tdTutors);
      }

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    daySection.appendChild(table);
    container.appendChild(daySection);
  }

  // Footer Branding
  const footerDiv = document.createElement('div');
  footerDiv.style.borderTop = isSchoolBoard ? '1px solid #334155' : '1px solid #e2e8f0';
  footerDiv.style.paddingTop = '10px';
  footerDiv.style.marginTop = '10px';
  footerDiv.style.fontSize = '10px';
  footerDiv.style.color = isSchoolBoard ? '#64748b' : '#94a3b8';
  footerDiv.style.display = 'flex';
  footerDiv.style.justifyContent = 'space-between';
  footerDiv.innerHTML = `
    <span>Sistema de Gestão de Horários — Pré-Vestibular</span>
    <span>Layout: ${
      theme === 'school_board'
        ? 'Mural Escolar'
        : theme === 'modern_cards'
        ? 'Cartões Modernos'
        : theme === 'compact_density'
        ? 'Alta Densidade'
        : 'Planilha Clássica'
    }</span>
  `;
  container.appendChild(footerDiv);

  return container;
}

/**
 * Builds an XLSX workbook for a specific list of days
 */
function buildWorkbookForDays(week: WeekSchedule, days: DayOfWeek[], options?: ExportFilterOptions): XLSX.WorkBook {
  const { title, activeDays, generatedSlots, classes, subjects, teachers, loads, rules, grid, institutionName } = week;
  const validation = validateSchedule(grid, activeDays, generatedSlots, classes, subjects, teachers, rules, loads);
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const displayClasses = getDisplayClasses(classes);
  const showTimestamp = options?.includeTimestamp !== false;

  const rows: any[][] = [];
  if (institutionName) {
    rows.push([institutionName.toUpperCase()]);
  }
  rows.push([title.toUpperCase()]);
  
  const headerMeta = [`Período: ${week.dateRange || 'Semana Regular'}`];
  if (showTimestamp) {
    headerMeta.push(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`);
  }
  rows.push(headerMeta);
  rows.push([]);

  for (const dayKey of days) {
    const dayMeta = DAYS_OF_WEEK.find((d) => d.key === dayKey);
    const dayTitle = dayMeta ? dayMeta.label.toUpperCase() : dayKey;

    rows.push([`=== ${dayTitle} ===`]);

    const headerRow = ['Horário', 'Tempo / Atividade'];
    for (const cls of displayClasses) {
      headerRow.push(cls.name);
    }
    headerRow.push('Tutores em Janela (Disponíveis)');
    headerRow.push('Avisos & Validações');
    rows.push(headerRow);

    for (const slot of generatedSlots) {
      const timeStr = `${slot.startTime} - ${slot.endTime}`;
      const rowData: string[] = [timeStr, slot.name];

      if (slot.type === 'interval' || slot.type === 'event') {
        const bannerText = `--- ${slot.name.toUpperCase()} (${slot.durationMinutes} min) ---`;
        for (let i = 0; i < displayClasses.length; i++) {
          rowData.push(bannerText);
        }
        rowData.push('-');
        rowData.push('✓');
      } else {
        for (const cls of displayClasses) {
          const cell = resolveCellForClass(grid, dayKey, slot.id, cls.id, classes);
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

        const tutorsInSlot = validation.windowTutors
          .filter((w) => w.day === dayKey && w.slotId === slot.id)
          .map((w) => w.teacherName);
        rowData.push(tutorsInSlot.length > 0 ? tutorsInSlot.join(', ') : 'Nenhum');

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

    rows.push([]);
  }

  const wb = XLSX.utils.book_new();
  const wsGrade = XLSX.utils.aoa_to_sheet(rows);
  wsGrade['!cols'] = [
    { wch: 16 },
    { wch: 20 },
    ...displayClasses.map(() => ({ wch: 26 })),
    { wch: 30 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, wsGrade, 'Grade Semanal');

  // Sheet 2: Carga Horária
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
  const wsLoads = XLSX.utils.aoa_to_sheet(loadRows);
  wsLoads['!cols'] = [{ wch: 16 }, { wch: 26 }, { wch: 14 }, { wch: 16 }, { wch: 10 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsLoads, 'Carga Horária');

  return wb;
}

export async function exportScheduleToExcel(
  week: WeekSchedule,
  options?: ExportFilterOptions
) {
  const targetDays = options?.selectedDays && options.selectedDays.length > 0 ? options.selectedDays : week.activeDays;

  if (options?.separateZip) {
    const zip = new JSZip();
    for (const dayKey of targetDays) {
      const dayMeta = DAYS_OF_WEEK.find((d) => d.key === dayKey);
      const dayLabel = dayMeta ? dayMeta.label.replace(/\s+/g, '_') : dayKey;
      const wb = buildWorkbookForDays(week, [dayKey], options);
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      zip.file(`Grade_${dayLabel}.xlsx`, wbout);
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = `Grade_${week.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Planilhas_Por_Dia.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  const wb = buildWorkbookForDays(week, targetDays, options);
  const safeFilename = `Grade_${week.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, safeFilename);
}

export async function exportScheduleToPNG(
  weekOrElementId: WeekSchedule | string,
  filenameOrOptions?: string | ExportFilterOptions
) {
  let options: ExportFilterOptions = {};
  let customFilename = '';

  if (typeof filenameOrOptions === 'string') {
    customFilename = filenameOrOptions;
  } else if (typeof filenameOrOptions === 'object') {
    options = filenameOrOptions;
  }

  if (typeof weekOrElementId === 'object' && weekOrElementId !== null) {
    const week = weekOrElementId;
    const targetDays = options.selectedDays && options.selectedDays.length > 0 ? options.selectedDays : week.activeDays;

    const bgThemeColor =
      options.layoutTheme === 'school_board'
        ? '#0f172a'
        : options.layoutTheme === 'modern_cards'
        ? '#f8fafc'
        : '#ffffff';

    if (options.separateZip) {
      const zip = new JSZip();
      for (const dayKey of targetDays) {
        const dayMeta = DAYS_OF_WEEK.find((d) => d.key === dayKey);
        const dayLabel = dayMeta ? dayMeta.label.replace(/\s+/g, '_') : dayKey;

        const dayContainer = createExportableScheduleElement(week, [dayKey], options);
        document.body.appendChild(dayContainer);

        try {
          const canvas = await html2canvas(dayContainer, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: bgThemeColor,
            logging: false,
            onclone: (clonedDoc) => {
              sanitizeUnsupportedCssColors(clonedDoc);
              clonedDoc.querySelectorAll('.hide-on-export').forEach((el) => {
                (el as HTMLElement).style.display = 'none';
              });
            },
          });

          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (blob) {
            zip.file(`Grade_${dayLabel}.png`, blob);
          }
        } finally {
          if (dayContainer.parentNode) {
            dayContainer.parentNode.removeChild(dayContainer);
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `Grade_${week.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Imagens_Por_Dia.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    // Single Image with all selected days
    const exportContainer = createExportableScheduleElement(week, targetDays, options);
    document.body.appendChild(exportContainer);
    const filename = customFilename || `Grade_${week.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;

    try {
      const canvas = await html2canvas(exportContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: bgThemeColor,
        logging: false,
        onclone: (clonedDoc) => {
          sanitizeUnsupportedCssColors(clonedDoc);
          clonedDoc.querySelectorAll('.hide-on-export').forEach((el) => {
            (el as HTMLElement).style.display = 'none';
          });
        },
      });

      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      if (exportContainer.parentNode) {
        exportContainer.parentNode.removeChild(exportContainer);
      }
    }
  } else {
    // Legacy element ID path
    const exportContainer = document.getElementById(weekOrElementId as string);
    if (!exportContainer) {
      throw new Error('Elemento da grade não encontrado para exportação');
    }
    const filename = customFilename || 'grade_semanal.png';

    const canvas = await html2canvas(exportContainer, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: (clonedDoc) => {
        sanitizeUnsupportedCssColors(clonedDoc);
        clonedDoc.querySelectorAll('.hide-on-export').forEach((el) => {
          (el as HTMLElement).style.display = 'none';
        });
      },
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

export async function exportScheduleToPDF(
  weekOrElementId: WeekSchedule | string,
  titleOrOptions?: string | ExportFilterOptions
) {
  let options: ExportFilterOptions = {};
  let customTitle = '';

  if (typeof titleOrOptions === 'string') {
    customTitle = titleOrOptions;
  } else if (typeof titleOrOptions === 'object') {
    options = titleOrOptions;
  }

  if (typeof weekOrElementId === 'object' && weekOrElementId !== null) {
    const week = weekOrElementId;
    const targetDays = options.selectedDays && options.selectedDays.length > 0 ? options.selectedDays : week.activeDays;
    const bgThemeColor =
      options.layoutTheme === 'school_board'
        ? '#0f172a'
        : options.layoutTheme === 'modern_cards'
        ? '#f8fafc'
        : '#ffffff';

    if (options.separateZip) {
      const zip = new JSZip();
      for (const dayKey of targetDays) {
        const dayMeta = DAYS_OF_WEEK.find((d) => d.key === dayKey);
        const dayLabel = dayMeta ? dayMeta.label.replace(/\s+/g, '_') : dayKey;

        const dayContainer = createExportableScheduleElement(week, [dayKey], options);
        document.body.appendChild(dayContainer);

        try {
          const canvas = await html2canvas(dayContainer, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: bgThemeColor,
            logging: false,
            onclone: (clonedDoc) => {
              sanitizeUnsupportedCssColors(clonedDoc);
              clonedDoc.querySelectorAll('.hide-on-export').forEach((el) => {
                (el as HTMLElement).style.display = 'none';
              });
            },
          });

          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4',
          });

          const pdfWidth = pdf.internal.pageSize.getWidth();
          const margin = 8;
          const printableWidth = pdfWidth - margin * 2;
          const imgWidth = printableWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
          const pdfBlob = pdf.output('blob');
          zip.file(`Grade_${dayLabel}.pdf`, pdfBlob);
        } finally {
          if (dayContainer.parentNode) {
            dayContainer.parentNode.removeChild(dayContainer);
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `Grade_${week.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_PDFs_Por_Dia.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    // Single Combined PDF
    const exportContainer = createExportableScheduleElement(week, targetDays, options);
    document.body.appendChild(exportContainer);
    const pdfTitle = customTitle || week.title;

    try {
      const canvas = await html2canvas(exportContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: bgThemeColor,
        logging: false,
        onclone: (clonedDoc) => {
          sanitizeUnsupportedCssColors(clonedDoc);
          clonedDoc.querySelectorAll('.hide-on-export').forEach((el) => {
            (el as HTMLElement).style.display = 'none';
          });
        },
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const printableWidth = pdfWidth - margin * 2;
      const printableHeight = pdfHeight - margin * 2;

      const imgWidth = printableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= printableHeight) {
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      } else {
        let remainingHeight = imgHeight;
        let position = margin;

        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        remainingHeight -= printableHeight;

        while (remainingHeight > 0) {
          position = position - printableHeight;
          pdf.addPage('a4', 'landscape');
          pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
          remainingHeight -= printableHeight;
        }
      }

      pdf.save(`Grade_${pdfTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
    } finally {
      if (exportContainer.parentNode) {
        exportContainer.parentNode.removeChild(exportContainer);
      }
    }
  } else {
    // Legacy element ID path
    const exportContainer = document.getElementById(weekOrElementId as string);
    if (!exportContainer) {
      throw new Error('Elemento da grade não encontrado para exportação');
    }
    const pdfTitle = customTitle || 'Grade Semanal';

    const canvas = await html2canvas(exportContainer, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: (clonedDoc) => {
        sanitizeUnsupportedCssColors(clonedDoc);
        clonedDoc.querySelectorAll('.hide-on-export').forEach((el) => {
          (el as HTMLElement).style.display = 'none';
        });
      },
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const margin = 8;
    const printableWidth = pdfWidth - margin * 2;
    const imgWidth = printableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
    pdf.save(`Grade_${pdfTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
  }
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
