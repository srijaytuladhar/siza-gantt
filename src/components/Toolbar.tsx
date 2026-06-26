import React, { useState } from 'react';
import { useGanttStore } from '../store/ganttStore';
import {
  FiPlus,
  FiRotateCcw,
  FiRotateCw,
  FiSun,
  FiMoon,
  FiCalendar,
  FiTrello,
  FiSettings,
  FiMenu,
  FiX,
} from 'react-icons/fi';
import { SettingsModal } from './SettingsModal';

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
    undo,
    redo,
    viewMode,
    setViewMode,
  } = useGanttStore();

  const [showSettings, setShowSettings] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleAddProject = () => {
    const name = prompt('Enter Project Name:');
    if (name && name.trim()) {
      addProject(name.trim());
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 sm:px-4 flex items-center justify-between shrink-0 select-none z-30">
        {/* Brand & Left Actions */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <span className="text-white font-extrabold text-sm tracking-tighter">SG</span>
            </div>
            <span className="font-bold tracking-tight text-zinc-900 dark:text-zinc-50 hidden sm:inline-block">
              Siza<span className="text-indigo-500">Gantt</span>
            </span>
          </div>

          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

          {/* View Switcher */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-2 sm:px-3 py-1 text-xs font-bold rounded-md flex items-center space-x-1 sm:space-x-1.5 transition-all duration-150 cursor-pointer ${viewMode === 'timeline'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <FiCalendar className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Timeline</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-2 sm:px-3 py-1 text-xs font-bold rounded-md flex items-center space-x-1 sm:space-x-1.5 transition-all duration-150 cursor-pointer ${viewMode === 'kanban'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <FiTrello className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Kanban</span>
            </button>
          </div>

          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

          {/* New Project button — hidden on very small screens (use hamburger) */}
          <button
            onClick={handleAddProject}
            className="hidden sm:flex items-center space-x-1 px-3 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all duration-200"
          >
            <FiPlus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-1 sm:space-x-3">
          {/* Undo/Redo — hidden on mobile */}
          <div className="hidden sm:flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5">
            <button
              onClick={undo}
              className="p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all"
              title="Undo (Ctrl+Z)"
            >
              <FiRotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              className="p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all"
              title="Redo (Ctrl+Y)"
            >
              <FiRotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom selector — hidden on mobile */}
          {viewMode === 'timeline' && (
            <div className="hidden sm:flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5">
              {(['days', 'weeks', 'months'] as const).map((z) => (
                <button
                  key={z}
                  onClick={() => setZoom(z)}
                  className={`px-2 sm:px-3 py-1 text-xs font-semibold rounded-md uppercase tracking-wider transition-all duration-150 ${zoom === z
                    ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
                >
                  {z.slice(0, -1)}
                </button>
              ))}
            </div>
          )}

          {/* Today button — hidden on mobile */}
          {viewMode === 'timeline' && (
            <button
              onClick={onScrollToToday}
              className="hidden sm:flex items-center space-x-1.5 px-3 h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-all"
            >
              <FiCalendar className="w-4 h-4" />
              <span>Today</span>
            </button>
          )}

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 h-9 w-9 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 transition-all"
            title={`Toggle Theme`}
          >
            {theme === 'dark' ? (
              <FiSun className="w-4 h-4 mx-auto text-yellow-500" />
            ) : (
              <FiMoon className="w-4 h-4 mx-auto text-indigo-500" />
            )}
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 h-9 w-9 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 transition-all"
            title="Open Settings"
          >
            <FiSettings className="w-4 h-4 mx-auto" />
          </button>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 h-9 w-9 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 transition-all"
          >
            {mobileMenuOpen ? <FiX className="w-4 h-4 mx-auto" /> : <FiMenu className="w-4 h-4 mx-auto" />}
          </button>
        </div>
      </header>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 space-y-2 z-20 shadow-lg">
          {/* New Project */}
          <button
            onClick={handleAddProject}
            className="w-full flex items-center space-x-2 px-3 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all"
          >
            <FiPlus className="w-4 h-4" />
            <span>New Project</span>
          </button>

          {/* Undo / Redo */}
          <div className="flex space-x-2">
            <button
              onClick={() => { undo(); setMobileMenuOpen(false); }}
              className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium"
            >
              <FiRotateCcw className="w-4 h-4" />
              <span>Undo</span>
            </button>
            <button
              onClick={() => { redo(); setMobileMenuOpen(false); }}
              className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium"
            >
              <FiRotateCw className="w-4 h-4" />
              <span>Redo</span>
            </button>
          </div>

          {/* Zoom (timeline only) */}
          {viewMode === 'timeline' && (
            <div className="flex space-x-2">
              {(['days', 'weeks', 'months'] as const).map((z) => (
                <button
                  key={z}
                  onClick={() => { setZoom(z); setMobileMenuOpen(false); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all ${zoom === z
                    ? 'bg-indigo-600 text-white'
                    : 'border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'}`}
                >
                  {z.slice(0, -1)}
                </button>
              ))}
            </div>
          )}

          {/* Today */}
          {viewMode === 'timeline' && (
            <button
              onClick={() => { onScrollToToday(); setMobileMenuOpen(false); }}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium"
            >
              <FiCalendar className="w-4 h-4" />
              <span>Jump to Today</span>
            </button>
          )}
        </div>
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
};
