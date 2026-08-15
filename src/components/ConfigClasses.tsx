import React, { useState } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Layers,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Wand2,
} from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';
import { ClassGroup } from '../types';

export const ConfigClasses: React.FC = () => {
  const {
    activeWeek,
    addClassGroup,
    updateClassGroup,
    deleteClassGroup,
    reorderClasses,
  } = useSchedule();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [defaultRoom, setDefaultRoom] = useState('');
  const [isGrouped, setIsGrouped] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  if (!activeWeek) return null;

  const standardClasses = activeWeek.classes.filter((c) => !c.isGrouped && c.id !== editingId);

  const resetForm = () => {
    setName('');
    setColor('#2563eb');
    setDefaultRoom('');
    setIsGrouped(false);
    setSelectedMemberIds([]);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleStartEdit = (cls: ClassGroup) => {
    setEditingId(cls.id);
    setName(cls.name);
    setColor(cls.color || '#2563eb');
    setDefaultRoom(cls.defaultRoom || '');
    setIsGrouped(cls.isGrouped);
    setSelectedMemberIds(cls.groupedClassIds || []);
    setIsAdding(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      updateClassGroup({
        id: editingId,
        name: name.trim(),
        color,
        defaultRoom: defaultRoom.trim() || undefined,
        isGrouped,
        groupedClassIds: isGrouped ? selectedMemberIds : undefined,
      });
    } else {
      const newId = `cls_${Date.now()}`;
      addClassGroup({
        id: newId,
        name: name.trim(),
        color,
        defaultRoom: defaultRoom.trim() || undefined,
        isGrouped,
        groupedClassIds: isGrouped ? selectedMemberIds : undefined,
      });
    }

    resetForm();
  };

  const toggleMemberSelection = (classId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  // Auto generate combined title with separator
  const generateCombinedTitle = (separator: string = '/') => {
    if (selectedMemberIds.length === 0) return;
    const names = selectedMemberIds
      .map((id) => activeWeek.classes.find((c) => c.id === id)?.name)
      .filter(Boolean);
    if (names.length > 0) {
      setName(names.join(separator));
    }
  };

  // Reordering handlers
  const handleMoveClass = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= activeWeek.classes.length) return;
    const reordered = [...activeWeek.classes];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    reorderClasses(reordered);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const reordered = [...activeWeek.classes];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, moved);
    setDraggedIndex(index);
    reorderClasses(reordered);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Gerenciamento de Turmas & Agrupamentos de Salas
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cadastre as turmas individuais ou agrupadas. Arraste ou use as setas para definir a ordem exata em que aparecem na grade semanal.
          </p>
        </div>

        {!isAdding && !editingId && (
          <button
            id="btn_add_class"
            onClick={() => {
              resetForm();
              setIsAdding(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Turma
          </button>
        )}
      </div>

      {/* Add / Edit Form Card */}
      {(isAdding || editingId) && (
        <form onSubmit={handleSave} className="bg-white p-5 rounded-2xl border-2 border-indigo-200 shadow-sm space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              {editingId ? 'Editar Turma' : 'Cadastrar Nova Turma'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nome da Turma *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: MACC01 (Medicina) ou MACC01/MACC02"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Sala Padrão / Local
              </label>
              <input
                type="text"
                value={defaultRoom}
                onChange={(e) => setDefaultRoom(e.target.value)}
                placeholder="Ex: Sala 101, Auditório Alpha"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Cor de Identificação
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg uppercase"
                />
              </div>
            </div>
          </div>

          {/* Grouped Option */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-teal-600" />
                  Esta é uma Turma Agrupada (várias turmas juntas)?
                </div>
                <p className="text-[11px] text-slate-500">
                  Na grade semanal, apenas a turma agrupada será exibida como coluna única, ocultando as turmas individuais que a compõem.
                </p>
              </div>
              <input
                type="checkbox"
                checked={isGrouped}
                onChange={(e) => setIsGrouped(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded-sm focus:ring-teal-500 border-slate-300"
              />
            </div>

            {isGrouped && (
              <div className="pt-2 border-t border-slate-200 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs font-medium text-slate-700">
                    Selecione as turmas que compõem este agrupamento:
                  </label>
                  {selectedMemberIds.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-slate-500">Gerar nome automático:</span>
                      <button
                        type="button"
                        onClick={() => generateCombinedTitle('/')}
                        className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 rounded-md font-medium inline-flex items-center gap-1"
                        title="Juntar nomes com barra (Ex: A/B)"
                      >
                        <Wand2 className="w-3 h-3" /> com &quot;/&quot;
                      </button>
                      <button
                        type="button"
                        onClick={() => generateCombinedTitle(' + ')}
                        className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 rounded-md font-medium inline-flex items-center gap-1"
                        title="Juntar nomes com mais (Ex: A + B)"
                      >
                        com &quot;+&quot;
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {standardClasses.map((sc) => {
                    const isSelected = selectedMemberIds.includes(sc.id);
                    return (
                      <button
                        type="button"
                        key={sc.id}
                        onClick={() => toggleMemberSelection(sc.id)}
                        className={`px-3 py-1 text-xs rounded-lg border font-medium transition flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-700 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{sc.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
              {editingId ? 'Atualizar Turma' : 'Cadastrar Turma'}
            </button>
          </div>
        </form>
      )}

      {/* Class List Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center justify-between">
          <span>Turmas Cadastradas ({activeWeek.classes.length})</span>
          <span className="text-[11px] text-slate-500 font-normal normal-case">
            💡 Arraste pelo ícone ou use as setas para definir a ordem das colunas na grade
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {activeWeek.classes.map((cls, idx) => (
            <div
              key={cls.id}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50 transition gap-3 ${
                draggedIndex === idx ? 'opacity-40 bg-indigo-50 border-2 border-dashed border-indigo-400' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Reorder handle and arrows */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <div className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 rounded">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => handleMoveClass(idx, 'up')}
                      disabled={idx === 0}
                      title="Mover turma para cima / esquerda na grade"
                      className="p-0.5 text-slate-400 hover:text-indigo-600 disabled:opacity-20 transition"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveClass(idx, 'down')}
                      disabled={idx === activeWeek.classes.length - 1}
                      title="Mover turma para baixo / direita na grade"
                      className="p-0.5 text-slate-400 hover:text-indigo-600 disabled:opacity-20 transition"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div
                  className="w-3.5 h-9 rounded-full shrink-0"
                  style={{ backgroundColor: cls.color || '#6366f1' }}
                />

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{cls.name}</span>
                    {cls.isGrouped ? (
                      <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full border border-teal-200 flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        Agrupada (Exibida na Grade)
                      </span>
                    ) : (
                      activeWeek.classes.some((g) => g.isGrouped && g.groupedClassIds?.includes(cls.id)) && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                          Membro de grupo (Oculta na grade)
                        </span>
                      )
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {cls.defaultRoom ? `Sala: ${cls.defaultRoom}` : 'Sem sala fixa'}
                    {cls.isGrouped && cls.groupedClassIds && (
                      <span className="text-slate-600 font-medium ml-2">
                        • Reúne: {cls.groupedClassIds.map((id) => activeWeek.classes.find((c) => c.id === id)?.name || id).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleStartEdit(cls)}
                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                  title="Editar Turma"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteClassGroup(cls.id)}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Excluir Turma"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
