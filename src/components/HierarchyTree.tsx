import React, { useState, useEffect, useRef } from 'react';
import { useGanttStore } from '../store/ganttStore';
import type { FlatRow } from '../types/gantt';
import { FEATURE_COLORS } from '../utils/dateUtils';
import { 
  FiChevronDown, 
  FiChevronRight, 
  FiBriefcase, 
  FiLayers, 
  FiCheckSquare, 
  FiPlus, 
  FiTrash2
} from 'react-icons/fi';

interface TreeRowProps {
  item: FlatRow;
}

export const TreeRow: React.FC<TreeRowProps> = React.memo(({ item }) => {
  const {
    selectedId,
    editingId,
    setSelectedId,
    setEditingId,
    renameItem,
    deleteItem,
    toggleCollapse,
    addFeature,
    addTask,
    setProjectColor,
    moveTaskToFeature,
    moveTaskToUncategorized,
  } = useGanttStore();

  const [editValue, setEditValue] = useState(item.name);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isSelected = selectedId === item.id;
  const isEditing = editingId === item.id;

  // Sync edit value when item name changes or editing starts
  useEffect(() => {
    if (isEditing) {
      setEditValue(item.name);
      // Auto focus and select input text
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isEditing, item.name]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.id === 'project_uncategorized') return;
    setEditingId(item.id);
  };

  const handleSaveRename = () => {
    if (editValue.trim() && editValue.trim() !== item.name) {
      renameItem(item.id, item.type, editValue.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      setEditValue(item.name);
      setEditingId(null);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete this ${item.type} and all its contents?`)) {
      deleteItem(item.id, item.type);
    }
  };

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.id === 'project_uncategorized') {
      const name = prompt('Enter Uncategorized Task Name:');
      if (name && name.trim()) {
        addTask('feature_uncategorized', name.trim());
      }
    } else if (item.type === 'project') {
      const name = prompt('Enter Feature Name:');
      if (name && name.trim()) {
        addFeature(item.id, name.trim());
      }
    } else if (item.type === 'feature') {
      const name = prompt('Enter Task Name:');
      if (name && name.trim()) {
        addTask(item.id, name.trim());
      }
    }
  };

  const handleCollapseToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type !== 'task') {
      toggleCollapse(item.id, item.type as 'project' | 'feature');
    }
  };

  const handleRowClick = () => {
    setSelectedId(item.id);
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (item.type === 'task') {
      e.dataTransfer.setData('taskId', item.id);
      e.dataTransfer.setData('sourceParentId', item.parentId || '');
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (item.type === 'feature' || item.id === 'project_uncategorized') {
      e.preventDefault();
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;

    if (item.type === 'feature') {
      moveTaskToFeature(taskId, item.id);
    } else if (item.id === 'project_uncategorized') {
      moveTaskToUncategorized(taskId);
    }
  };

  // Indentation calculation based on level
  const indentClass = [
    'pl-3', // Project: Level 0
    'pl-8', // Feature: Level 1
    'pl-14', // Task: Level 2
  ][item.level];

  // Highlight color based on type
  const rowHighlightClass = isSelected
    ? 'bg-indigo-500/10 border-l-2 border-indigo-500 dark:bg-indigo-500/15'
    : 'hover:bg-zinc-100/70 dark:hover:bg-zinc-900/60 border-l-2 border-transparent';

  const dragOverClass = isDragOver
    ? 'bg-indigo-500/20 border-l-4 border-l-indigo-600 dark:bg-indigo-500/25 ring-2 ring-indigo-500/20'
    : '';

  // Get item type icon
  const getIcon = () => {
    switch (item.type) {
      case 'project':
        const projColorCfg = FEATURE_COLORS[item.color || 'indigo'] || FEATURE_COLORS.indigo;
        return (
          <div className="relative flex items-center shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (item.id === 'project_uncategorized') return;
                setShowColorPicker(!showColorPicker);
              }}
              className={`p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer`}
              title={item.id === 'project_uncategorized' ? 'Uncategorized Project' : 'Change Project Color'}
            >
              <FiBriefcase className={`w-4 h-4 shrink-0 ${projColorCfg.text}`} />
            </button>

            {showColorPicker && (
              <div 
                className="absolute left-6 top-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-lg p-1.5 shadow-xl flex items-center space-x-1.5 z-50 glass-panel border-zinc-300"
                onClick={(e) => e.stopPropagation()}
              >
                {Object.keys(FEATURE_COLORS).map((cKey) => {
                  const cfg = FEATURE_COLORS[cKey];
                  return (
                    <button
                      key={cKey}
                      onClick={() => {
                        setProjectColor(item.id, cKey);
                        setShowColorPicker(false);
                      }}
                      className={`w-3.5 h-3.5 rounded-full ${cfg.dot} hover:scale-125 transition-transform cursor-pointer border border-white dark:border-zinc-800`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      case 'feature':
        return <FiLayers className="w-4 h-4 text-orange-500 dark:text-orange-400 shrink-0" />;
      case 'task':
        return <FiCheckSquare className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />;
    }
  };

  return (
    <div
      onClick={handleRowClick}
      onDoubleClick={handleDoubleClick}
      draggable={item.type === 'task'}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`h-full flex items-center justify-between pr-3 group cursor-pointer transition-all border-b border-zinc-200/50 dark:border-zinc-800/40 ${indentClass} ${rowHighlightClass} ${dragOverClass} ${item.type === 'task' ? 'active:opacity-50 select-none' : ''}`}
    >
      <div className="flex items-center space-x-2 overflow-hidden flex-1 py-1">
        {/* Collapse Arrow */}
        {item.type !== 'task' ? (
          <button
            onClick={handleCollapseToggle}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-500 dark:text-zinc-400 cursor-pointer"
          >
            {item.collapsed ? (
              <FiChevronRight className="w-3.5 h-3.5" />
            ) : (
              <FiChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <div className="w-5.5" /> // Spacer for alignment
        )}

        {/* Type Icon */}
        {getIcon()}

        {/* Name Inline Editor */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveRename}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm font-medium text-zinc-950 dark:text-white"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={`text-sm truncate select-none ${
              item.type === 'project'
                ? 'font-bold text-zinc-900 dark:text-zinc-100'
                : item.type === 'feature'
                ? 'font-semibold text-zinc-700 dark:text-zinc-300'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            {item.name}
          </span>
        )}
      </div>

      {/* Hover action buttons */}
      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
        {item.type !== 'task' && (
          <button
            onClick={handleAddChild}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-all"
            title={item.id === 'project_uncategorized' ? 'Add Task' : item.type === 'project' ? 'Add Feature' : 'Add Task'}
          >
            <FiPlus className="w-3.5 h-3.5" />
          </button>
        )}
        {item.id !== 'project_uncategorized' && (
          <button
            onClick={handleDelete}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-all"
            title="Delete"
          >
            <FiTrash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
});

TreeRow.displayName = 'TreeRow';
