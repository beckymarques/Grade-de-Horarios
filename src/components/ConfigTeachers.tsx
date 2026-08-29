import React, { useState } from 'react';
import {
  GraduationCap,
  Plus,
  Trash2,
  Edit2,
  CalendarOff,
  Building2,
  BookOpen,
  Check,
  X,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';
import {
  DayOfWeek,
  DAYS_OF_WEEK,
  Teacher,
  TeacherAllowedShift,
  Subject,
  SharedRoom,
  TeacherAbsence,
} from '../types';
import { getShiftLabel } from '../utils/timeCalculator';

export const ConfigTeachers: React.FC = () => {
  const {
    activeWeek,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    addSubject,
    updateSubject,
    deleteSubject,
    updateActiveWeek,
  } = useSchedule();

  const [activeSubTab, setActiveSubTab] = useState<'teachers' | 'subjects' | 'rooms'>('teachers');

  // Teacher Form State
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  const [tName, setTName] = useState('');
  const [tShortName, setTShortName] = useState('');
  const [tSubjectIds, setTSubjectIds] = useState<string[]>([]);
  const [tSharedRoomId, setTSharedRoomId] = useState<string>('');
  const [tAllowedShift, setTAllowedShift] = useState<TeacherAllowedShift>('all');
  const [tMaxConsecutive, setTMaxConsecutive] = useState<number>(3);
  const [tAbsences, setTAbsences] = useState<TeacherAbsence[]>([]);

  // Subject Form State
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [subName, setSubName] = useState('');
  const [subShortName, setSubShortName] = useState('');
  const [subColor, setSubColor] = useState('#2563eb');
  const [subIsHeavy, setSubIsHeavy] = useState(false);

  // Shared Room Form State
  const [newRoomName, setNewRoomName] = useState('');
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingRoomName, setEditingRoomName] = useState('');

  if (!activeWeek) return null;

  // Teacher Form Handlers
  const resetTeacherForm = () => {
    setEditingTeacherId(null);
    setIsAddingTeacher(false);
    setTName('');
    setTShortName('');
    setTSubjectIds([]);
    setTSharedRoomId('');
    setTAllowedShift('all');
    setTMaxConsecutive(3);
    setTAbsences([]);
  };

  const handleStartEditTeacher = (t: Teacher) => {
    setEditingTeacherId(t.id);
    setTName(t.name);
    setTShortName(t.shortName);
    setTSubjectIds(t.subjectIds || []);
    setTSharedRoomId(t.sharedRoomId || '');
    setTAllowedShift(t.allowedShift || 'all');
    setTMaxConsecutive(t.maxConsecutiveLessons || 3);
    setTAbsences(t.absences || []);
    setIsAddingTeacher(false);
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tName.trim()) return;

    const teacherData: Teacher = {
      id: editingTeacherId || `tea_${Date.now()}`,
      name: tName.trim(),
      shortName: tShortName.trim() || tName.split(' ')[0],
      subjectIds: tSubjectIds,
      sharedRoomId: tSharedRoomId || undefined,
      allowedShift: tAllowedShift,
      maxConsecutiveLessons: tMaxConsecutive,
      absences: tAbsences,
    };

    if (editingTeacherId) {
      updateTeacher(teacherData);
    } else {
      addTeacher(teacherData);
    }

    resetTeacherForm();
  };

  const toggleTeacherSubject = (subId: string) => {
    if (tSubjectIds.includes(subId)) {
      setTSubjectIds(tSubjectIds.filter((id) => id !== subId));
    } else {
      setTSubjectIds([...tSubjectIds, subId]);
    }
  };

  const handleAddAbsence = (day: DayOfWeek) => {
    const existing = tAbsences.find((a) => a.day === day);
    if (existing) {
      setTAbsences(tAbsences.filter((a) => a.day !== day));
    } else {
      setTAbsences([...tAbsences, { day, allDay: true, reason: 'Falta / Indisponibilidade' }]);
    }
  };

  // Subject Form Handlers
  const resetSubjectForm = () => {
    setEditingSubjectId(null);
    setIsAddingSubject(false);
    setSubName('');
    setSubShortName('');
    setSubColor('#2563eb');
    setSubIsHeavy(false);
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) return;

    const subData: Subject = {
      id: editingSubjectId || `sub_${Date.now()}`,
      name: subName.trim(),
      shortName: subShortName.trim() || subName.slice(0, 6),
      color: subColor,
      isHeavy: subIsHeavy,
    };

    if (editingSubjectId) {
      updateSubject(subData);
    } else {
      addSubject(subData);
    }

    resetSubjectForm();
  };

  // Shared Room Handlers
  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    const newRoom: SharedRoom = {
      id: `room_${Date.now()}`,
      name: newRoomName.trim(),
      teacherIds: [],
    };
    updateActiveWeek({
      sharedRooms: [...activeWeek.sharedRooms, newRoom],
    });
    setNewRoomName('');
  };

  const handleUpdateRoomName = (roomId: string, name: string) => {
    if (!name.trim()) return;
    updateActiveWeek({
      sharedRooms: activeWeek.sharedRooms.map((r) =>
        r.id === roomId ? { ...r, name: name.trim() } : r
      ),
    });
    setEditingRoomId(null);
  };

  const handleToggleTeacherInRoom = (roomId: string, teacherId: string) => {
    const teacher = activeWeek.teachers.find((t) => t.id === teacherId);
    if (!teacher) return;

    const isCurrentlyInThisRoom = teacher.sharedRoomId === roomId;
    const newSharedRoomId = isCurrentlyInThisRoom ? undefined : roomId;

    updateTeacher({
      ...teacher,
      sharedRoomId: newSharedRoomId,
    });
  };

  const handleDeleteRoom = (roomId: string) => {
    updateActiveWeek({
      sharedRooms: activeWeek.sharedRooms.filter((r) => r.id !== roomId),
      teachers: activeWeek.teachers.map((t) =>
        t.sharedRoomId === roomId ? { ...t, sharedRoomId: undefined } : t
      ),
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Top Banner with Sub-tabs */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Corpo Docente, Disciplinas & Salas Compartilhadas
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cadastre professores, disciplinas lecionadas, marcação de faltas/indisponibilidades e regras de salas compartilhadas.
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            onClick={() => setActiveSubTab('teachers')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeSubTab === 'teachers'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Professores ({activeWeek.teachers.length})
          </button>
          <button
            onClick={() => setActiveSubTab('subjects')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeSubTab === 'subjects'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Disciplinas ({activeWeek.subjects.length})
          </button>
          <button
            onClick={() => setActiveSubTab('rooms')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeSubTab === 'rooms'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Salas Compartilhadas ({activeWeek.sharedRooms.length})
          </button>
        </div>
      </div>

      {/* SUB-TAB: TEACHERS */}
      {activeSubTab === 'teachers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Lista de Professores & Disponibilidade
            </h3>
            {!isAddingTeacher && !editingTeacherId && (
              <button
                id="btn_add_teacher"
                onClick={() => {
                  resetTeacherForm();
                  setIsAddingTeacher(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Professor
              </button>
            )}
          </div>

          {/* Teacher Form */}
          {(isAddingTeacher || editingTeacherId) && (
            <form
              onSubmit={handleSaveTeacher}
              className="bg-white p-5 rounded-2xl border-2 border-indigo-200 shadow-sm space-y-4 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  {editingTeacherId ? 'Editar Professor' : 'Novo Professor'}
                </h3>
                <button
                  type="button"
                  onClick={resetTeacherForm}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={tName}
                    onChange={(e) => setTName(e.target.value)}
                    placeholder="Ex: Prof. Carlos Eduardo"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nome Curto (Exibição na Grade)
                  </label>
                  <input
                    type="text"
                    value={tShortName}
                    onChange={(e) => setTShortName(e.target.value)}
                    placeholder="Ex: Carlos (Mat)"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Sala Compartilhada (Restrição de Simultaneidade)
                  </label>
                  <select
                    value={tSharedRoomId}
                    onChange={(e) => setTSharedRoomId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                  >
                    <option value="">-- Nenhuma sala compartilhada --</option>
                    {activeWeek.sharedRooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Disciplinas Lecionadas */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Disciplinas que este professor leciona:
                </label>
                <div className="flex flex-wrap gap-2">
                  {activeWeek.subjects.map((sub) => {
                    const isSelected = tSubjectIds.includes(sub.id);
                    return (
                      <button
                        type="button"
                        key={sub.id}
                        onClick={() => toggleTeacherSubject(sub.id)}
                        className={`px-3 py-1 text-xs rounded-lg border font-medium transition flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{sub.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Faltas / Ausências por dia */}
              <div className="p-3.5 bg-rose-50/50 border border-rose-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                  <CalendarOff className="w-4 h-4 text-rose-600" />
                  <span>Marcação de Faltas / Indisponibilidades Semanais</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Clique nos dias em que o professor está ausente (todos os dias da semana estão disponíveis para marcar ou desmarcar ausências anteriores):
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {DAYS_OF_WEEK.map((dayMeta) => {
                    const dKey = dayMeta.key;
                    const isActiveInWeek = activeWeek.activeDays.includes(dKey);
                    const isAbsent = tAbsences.some((a) => a.day === dKey);
                    return (
                      <button
                        type="button"
                        key={dKey}
                        onClick={() => handleAddAbsence(dKey)}
                        className={`px-3 py-1.5 text-xs rounded-xl font-semibold border transition flex items-center gap-1.5 ${
                          isAbsent
                            ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                            : isActiveInWeek
                            ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {isAbsent ? (
                          <>
                            <span>⚠️ Ausente na {dayMeta.short}</span>
                            <span className="text-[10px] bg-rose-700 text-rose-100 px-1 rounded font-normal">
                              {isActiveInWeek ? 'Semana ativa' : 'Fora da semana'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span>{dayMeta.short} (Disponível)</span>
                            {!isActiveInWeek && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                (Inativo)
                              </span>
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Max Consecutive Lessons and Allowed Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Turno Permitido para Lecionar *
                  </label>
                  <select
                    value={tAllowedShift}
                    onChange={(e) => setTAllowedShift(e.target.value as TeacherAllowedShift)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white font-medium"
                  >
                    <option value="all">Todos os Turnos (Sem restrição)</option>
                    <option value="morning">Apenas Manhã</option>
                    <option value="afternoon">Apenas Tarde</option>
                    <option value="night">Apenas Noite</option>
                    <option value="morning_afternoon">Manhã e Tarde</option>
                    <option value="morning_night">Manhã e Noite</option>
                    <option value="afternoon_night">Tarde e Noite</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    A grade e o validador garantem que o professor não seja alocado em turnos não permitidos.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Máximo de Aulas Consecutivas sem Descanso
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={tMaxConsecutive}
                    onChange={(e) => setTMaxConsecutive(parseInt(e.target.value) || 3)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-bold"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Evita sobrecarga com muitas aulas seguidas sem janela.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetTeacherForm}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  {editingTeacherId ? 'Atualizar Professor' : 'Salvar Professor'}
                </button>
              </div>
            </form>
          )}

          {/* Teacher Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeWeek.teachers.map((teacher) => {
              const sharedRoom = activeWeek.sharedRooms.find((r) => r.id === teacher.sharedRoomId);
              const subjectNames = teacher.subjectIds
                .map((id) => {
                  const s = activeWeek.subjects.find((sub) => sub.id === id);
                  return s ? s.name : null;
                })
                .filter(Boolean)
                .join(', ');

              return (
                <div
                  key={teacher.id}
                  className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-sm text-slate-900">{teacher.name}</div>
                      <div className="text-xs text-indigo-700 font-semibold">{teacher.shortName}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEditTeacher(teacher)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTeacher(teacher.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <div>
                      <span className="font-medium text-slate-500">Disciplinas: </span>
                      <span className="font-semibold text-slate-800">{subjectNames || 'Nenhuma atribuída'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[11px] bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md border border-slate-200">
                        Turno: <strong className="text-indigo-900">{getShiftLabel(teacher.allowedShift || 'all')}</strong>
                      </span>

                      {sharedRoom && (
                        <div className="flex items-center gap-1 text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md text-[11px] border border-teal-200">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Sala: {sharedRoom.name}</span>
                        </div>
                      )}
                    </div>

                    {teacher.absences && teacher.absences.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        <span className="text-[11px] font-medium text-slate-500 mr-1">Ausências:</span>
                        {teacher.absences.map((a, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[10px] bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded-full border border-rose-200"
                          >
                            <span>⚠️ {a.day} {a.allDay ? '(Dia Todo)' : ''}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updatedAbsences = teacher.absences?.filter((ab) => ab.day !== a.day) || [];
                                updateTeacher({
                                  ...teacher,
                                  absences: updatedAbsences,
                                });
                              }}
                              className="hover:bg-rose-200 rounded-full p-0.5 text-rose-700"
                              title={`Remover ausência de ${a.day}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB: SUBJECTS */}
      {activeSubTab === 'subjects' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Grade Curricular de Disciplinas
            </h3>
            {!isAddingSubject && !editingSubjectId && (
              <button
                id="btn_add_subject"
                onClick={() => {
                  resetSubjectForm();
                  setIsAddingSubject(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                Nova Disciplina
              </button>
            )}
          </div>

          {/* Subject Form */}
          {(isAddingSubject || editingSubjectId) && (
            <form
              onSubmit={handleSaveSubject}
              className="bg-white p-5 rounded-2xl border-2 border-indigo-200 shadow-sm space-y-4 animate-in fade-in duration-150"
            >
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nome da Disciplina *
                  </label>
                  <input
                    type="text"
                    required
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                    placeholder="Ex: Física 1 (Mecânica)"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Sigla / Nome Curto
                  </label>
                  <input
                    type="text"
                    value={subShortName}
                    onChange={(e) => setSubShortName(e.target.value)}
                    placeholder="Ex: Fís 1"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Cor do Badge
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={subColor}
                      onChange={(e) => setSubColor(e.target.value)}
                      className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={subColor}
                      onChange={(e) => setSubColor(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-lg uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Is Heavy Toggle */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Marcar como Disciplina "Pesada" (Alta Carga Cognitiva)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Disciplinas pesadas (ex: Mat, Fís, Quím) ativam a regra de prevenção de tempos consecutivos pesados.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={subIsHeavy}
                  onChange={(e) => setSubIsHeavy(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500 border-slate-300"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetSubjectForm}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  {editingSubjectId ? 'Atualizar Disciplina' : 'Salvar Disciplina'}
                </button>
              </div>
            </form>
          )}

          {/* Subject List Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {activeWeek.subjects.map((sub) => (
              <div
                key={sub.id}
                className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: sub.color || '#3b82f6' }}
                  />
                  <div>
                    <div className="font-bold text-xs text-slate-900">{sub.name}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span className="font-semibold">{sub.shortName}</span>
                      {sub.isHeavy && (
                        <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-1.5 py-0.2 rounded">
                          Pesada
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingSubjectId(sub.id);
                      setSubName(sub.name);
                      setSubShortName(sub.shortName);
                      setSubColor(sub.color || '#2563eb');
                      setSubIsHeavy(sub.isHeavy || false);
                      setIsAddingSubject(false);
                    }}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded-md"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteSubject(sub.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB: SHARED ROOMS */}
      {activeSubTab === 'rooms' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-teal-600" />
                Salas Compartilhadas & Laboratórios
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Professores associados à mesma sala não poderão ter aulas alocadas no mesmo tempo da grade (evitando conflito de espaço físico). Você pode vincular ou desvincular os professores diretamente aqui, sem precisar abrir cada cadastro individual.
              </p>
            </div>

            {/* Add Room Form */}
            <form onSubmit={handleAddRoom} className="flex gap-2">
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Ex: Laboratório de Química, Sala Interativa 3D, Auditório Alpha"
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition"
              >
                Cadastrar Sala
              </button>
            </form>

            {/* List of Shared Rooms */}
            <div className="space-y-4 pt-2">
              {activeWeek.sharedRooms.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  Nenhuma sala compartilhada cadastrada.
                </div>
              ) : (
                activeWeek.sharedRooms.map((room) => {
                  const teachersInRoom = activeWeek.teachers.filter((t) => t.sharedRoomId === room.id);
                  const isEditingThisRoom = editingRoomId === room.id;

                  return (
                    <div
                      key={room.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        {isEditingThisRoom ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingRoomName}
                              onChange={(e) => setEditingRoomName(e.target.value)}
                              className="px-2.5 py-1 text-xs border border-indigo-300 rounded-lg bg-white font-bold flex-1"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateRoomName(room.id, editingRoomName)}
                              className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRoomId(null)}
                              className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded-lg"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-teal-600" />
                              <span>{room.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRoomId(room.id);
                                setEditingRoomName(room.name);
                              }}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-200"
                              title="Editar nome da sala"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => handleDeleteRoom(room.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Excluir Sala"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Direct Teacher Linking Section */}
                      <div className="pt-2 border-t border-slate-200">
                        <div className="text-[11px] font-semibold text-slate-600 mb-2">
                          Clique nos professores para vincular/desvincular desta sala:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {activeWeek.teachers.map((teacher) => {
                            const isInThisRoom = teacher.sharedRoomId === room.id;
                            const isInAnotherRoom = teacher.sharedRoomId && teacher.sharedRoomId !== room.id;
                            const otherRoomName = isInAnotherRoom
                              ? activeWeek.sharedRooms.find((r) => r.id === teacher.sharedRoomId)?.name
                              : null;
                            const teacherSubs = teacher.subjectIds
                              .map((id) => activeWeek.subjects.find((s) => s.id === id)?.shortName || activeWeek.subjects.find((s) => s.id === id)?.name)
                              .filter(Boolean)
                              .join(', ');

                            return (
                              <button
                                key={teacher.id}
                                type="button"
                                onClick={() => handleToggleTeacherInRoom(room.id, teacher.id)}
                                title={
                                  isInAnotherRoom
                                    ? `Atualmente em: ${otherRoomName}. Clique para transferir para ${room.name}.`
                                    : isInThisRoom
                                    ? `Vinculado a ${room.name}. Clique para remover.`
                                    : `Clique para vincular a ${room.name}.`
                                }
                                className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition inline-flex items-center gap-1.5 ${
                                  isInThisRoom
                                    ? 'bg-teal-600 text-white border-teal-700 shadow-2xs font-semibold'
                                    : isInAnotherRoom
                                    ? 'bg-amber-50 text-amber-800 border-amber-200 opacity-60 hover:opacity-100'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                {isInThisRoom && <Check className="w-3 h-3" />}
                                <span>
                                  {teacher.name}
                                  {teacherSubs && (
                                    <span className={`ml-1 text-[11px] font-normal ${isInThisRoom ? 'text-teal-100' : 'text-slate-500'}`}>
                                      ({teacherSubs})
                                    </span>
                                  )}
                                </span>
                                {isInAnotherRoom && (
                                  <span className="text-[9px] bg-amber-200 text-amber-900 px-1 rounded">
                                    outra sala
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
