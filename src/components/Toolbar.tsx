import React from 'react';
import { useGanttStore } from '../store/ganttStore';
import {
  FiPlus,
  FiTrash2,
  FiRotateCcw,
  FiRotateCw,
  FiSun,
  FiMoon,
  FiCalendar,
  FiZap,
  FiRefreshCw,
  FiTrello
} from 'react-icons/fi';

interface ToolbarProps {
  onScrollToToday: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onScrollToToday }) => {
  const {
    zoom,
    theme,
    setZoom,
    setTheme,
    addProject,
    clearAll,
    loadSampleData,
    loadHugeData,
    undo,
    redo,
    projectIds,
    viewMode,
    setViewMode,
  } = useGanttStore();

  const handleAddProject = () => {
    const name = prompt('Enter Project Name:');
    if (name && name.trim()) {
      addProject(name.trim());
    }
  };

  return (
    <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 flex items-center justify-between shrink-0 select-none z-30">

      {/* Brand & Left Actions */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <span className="text-white font-extrabold text-sm tracking-tighter">SG</span>
          </div>
          <span className="font-bold tracking-tight text-zinc-900 dark:text-zinc-50 hidden sm:inline-block">
            Siza<span className="text-indigo-500">Gantt</span>
          </span>
        </div>

        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block"></div>

        {/* View Switcher */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5 shrink-0">
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1 text-xs font-bold rounded-md flex items-center space-x-1.5 transition-all duration-150 cursor-pointer ${viewMode === 'timeline'
              ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
          >
            <FiCalendar className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Timeline</span>
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1 text-xs font-bold rounded-md flex items-center space-x-1.5 transition-all duration-150 cursor-pointer ${viewMode === 'kanban'
              ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
          >
            <FiTrello className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Kanban</span>
          </button>
        </div>

        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block"></div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleAddProject}
            className="flex items-center space-x-1 px-3 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all duration-200"
          >
            <FiPlus className="w-4.5 h-4.5" />
            <span>New Project</span>
          </button>

          <button hidden
            onClick={loadSampleData}
            title="Load Sample Project Data"
            className="hidden md:flex items-center space-x-1 px-2.5 h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-all"
          >
            <FiRefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>

          <button hidden
            onClick={loadHugeData}
            title="Load 100 Projects, 500 Features, 5,000 Tasks"
            className="flex items-center space-x-1 px-2.5 h-9 rounded-lg border border-yellow-500/30 hover:border-yellow-500/50 hover:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs font-semibold transition-all"
          >
            <FiZap className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
            <span>Load 5k Tasks</span>
          </button>

          {projectIds.length > 0 && (
            <button hidden
              onClick={() => {
                if (confirm('Delete all projects? This cannot be undone.')) clearAll();
              }}
              className="p-2 h-9 w-9 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-red-500/50 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-all"
              title="Clear Workspace"
            >
              <FiTrash2 className="w-4.5 h-4.5 mx-auto" />
            </button>
          )}
        </div>
      </div>

      {/* Undo/Redo & Zoom Controls */}
      <div className="flex items-center space-x-4">
        {/* Undo/Redo */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5">
          <button
            onClick={undo}
            className="p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all disabled:opacity-40"
            title="Undo (Ctrl+Z)"
          >
            <FiRotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            className="p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all disabled:opacity-40"
            title="Redo (Ctrl+Y)"
          >
            <FiRotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom selector */}
        {viewMode === 'timeline' && (
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5">
            {(['days', 'weeks', 'months'] as const).map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={`px-3 py-1 text-xs font-semibold rounded-md uppercase tracking-wider transition-all duration-150 ${zoom === z
                  ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
              >
                {z.slice(0, -1)}
              </button>
            ))}
          </div>
        )}

        {/* Today Indicator & Theme Toggle */}
        <div className="flex items-center space-x-2">
          {viewMode === 'timeline' && (
            <button
              onClick={onScrollToToday}
              className="flex items-center space-x-1.5 px-3 h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-all"
            >
              <FiCalendar className="w-4 h-4" />
              <span>Today</span>
            </button>
          )}

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 h-9 w-9 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 transition-all"
            title={`Toggle Theme (${theme === 'dark' ? 'Light' : 'Dark'})`}
          >
            {theme === 'dark' ? <FiSun className="w-4.5 h-4.5 mx-auto text-yellow-500" /> : <FiMoon className="w-4.5 h-4.5 mx-auto text-indigo-500" />}
          </button>
        </div>
      </div>
    </header>
  );
};
