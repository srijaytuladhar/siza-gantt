import React, { useState } from 'react';
import { useGanttStore } from '../store/ganttStore';
import type { Task, TaskStatus } from '../types/gantt';
import { FEATURE_COLORS, formatReadable } from '../utils/dateUtils';
import { FiCalendar, FiClock, FiLayers } from 'react-icons/fi';

interface KanbanColumnProps {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  onTaskDrop: (taskId: string, targetStatus: TaskStatus) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  title,
  tasks,
  onTaskDrop,
}) => {
  const { features, projects } = useGanttStore();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onTaskDrop(taskId, status);
    }
  };

  // Color configuration based on status
  const getStatusColor = () => {
    switch (status) {
      case 'todo':
        return {
          border: 'border-t-4 border-t-zinc-400 dark:border-t-zinc-600',
          bg: 'bg-zinc-100/50 dark:bg-zinc-900/40',
          badge: 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400',
        };
      case 'in_progress':
        return {
          border: 'border-t-4 border-t-amber-500',
          bg: 'bg-amber-500/5 dark:bg-amber-950/5',
          badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        };
      case 'done':
        return {
          border: 'border-t-4 border-t-emerald-500',
          bg: 'bg-emerald-500/5 dark:bg-emerald-950/5',
          badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450',
        };
    }
  };

  const colors = getStatusColor();

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 min-w-[280px] max-w-[420px] rounded-xl flex flex-col h-[calc(100vh-140px)] border border-zinc-200/60 dark:border-zinc-850/60 p-4 transition-all duration-200 ${
        colors.border
      } ${isDragOver ? 'bg-zinc-200/30 dark:bg-zinc-900/60 ring-2 ring-indigo-500/20' : colors.bg}`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 select-none shrink-0">
        <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{title}</h3>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>
          {tasks.length}
        </span>
      </div>

      {/* Cards List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {tasks.map((task) => {
          const parentFeature = features[task.parentId];
          const grandparentProject = parentFeature ? projects[parentFeature.parentId] : null;
          const colorCfg = grandparentProject
            ? FEATURE_COLORS[grandparentProject.color || 'slate'] || FEATURE_COLORS.slate
            : FEATURE_COLORS.slate;

          return (
            <div
              key={task.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('taskId', task.id);
                // HTML5 Drag ghost image opacity setting
                e.currentTarget.classList.add('opacity-40');
              }}
              onDragEnd={(e) => {
                e.currentTarget.classList.remove('opacity-40');
              }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/40 rounded-lg p-3.5 shadow-sm hover:shadow-md dark:shadow-black/25 cursor-grab active:cursor-grabbing hover:-translate-y-0.5 transition-all duration-200 select-none group border-l-3 border-l-emerald-500/30"
              style={{ borderLeftColor: colorCfg.dot === 'bg-orange-500' ? '#f97316' : colorCfg.dot === 'bg-cyan-500' ? '#06b6d4' : colorCfg.dot === 'bg-emerald-500' ? '#10b981' : colorCfg.dot === 'bg-violet-500' ? '#8b5cf6' : colorCfg.dot === 'bg-amber-500' ? '#f59e0b' : colorCfg.dot === 'bg-rose-500' ? '#f43f5e' : colorCfg.dot === 'bg-blue-500' ? '#3b82f6' : colorCfg.dot === 'bg-pink-500' ? '#ec4899' : '#6366f1' }}
            >
              {/* Card Title */}
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm mb-2 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                {task.name}
              </h4>

              {/* Parent Feature details */}
              {parentFeature && (
                <div className="flex items-center space-x-1.5 mb-2.5">
                  <FiLayers className={`w-3.5 h-3.5 shrink-0 ${colorCfg.text}`} />
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 truncate max-w-[180px]">
                    {parentFeature.name}
                  </span>
                </div>
              )}

              {/* Dates & Duration row */}
              <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 dark:border-zinc-800/40 text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold shrink-0">
                <div className="flex items-center space-x-1.5">
                  <FiCalendar className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{formatReadable(task.startDate)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <FiClock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{task.duration}d</span>
                </div>
              </div>
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className="h-28 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-center text-xs font-semibold text-zinc-400 dark:text-zinc-600 select-none">
            Drag tasks here
          </div>
        )}
      </div>
    </div>
  );
};

export const KanbanBoard: React.FC = () => {
  const { tasks, setTaskStatus } = useGanttStore();

  const allTasks = Object.values(tasks);

  const todoTasks = allTasks.filter((t) => t.status === 'todo' || !t.status);
  const inProgressTasks = allTasks.filter((t) => t.status === 'in_progress');
  const doneTasks = allTasks.filter((t) => t.status === 'done');

  const handleTaskDrop = (taskId: string, targetStatus: TaskStatus) => {
    setTaskStatus(taskId, targetStatus);
  };

  return (
    <div className="flex-1 w-full p-6 overflow-x-auto flex justify-center space-x-6 bg-zinc-50 dark:bg-zinc-950">
      <KanbanColumn
        status="todo"
        title="TO DO"
        tasks={todoTasks}
        onTaskDrop={handleTaskDrop}
      />
      <KanbanColumn
        status="in_progress"
        title="IN PROGRESS"
        tasks={inProgressTasks}
        onTaskDrop={handleTaskDrop}
      />
      <KanbanColumn
        status="done"
        title="DONE"
        tasks={doneTasks}
        onTaskDrop={handleTaskDrop}
      />
    </div>
  );
};
