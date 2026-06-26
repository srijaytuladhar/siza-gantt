import { useState, useEffect, useRef, useMemo } from 'react';
import { useGanttStore } from './store/ganttStore';
import { Toolbar } from './components/Toolbar';
import { VirtualList } from './components/VirtualList';
import { TreeRow } from './components/HierarchyTree';
import { TimelineRow, TimelineHeader } from './components/GanttTimeline';
import { KanbanBoard } from './components/KanbanBoard';
import { dateToX, formatDateStr, generateHeaders, ZOOM_CONFIG } from './utils/dateUtils';
import './App.css';

function App() {
  const {
    getFlatRows,
    zoom,
    viewStartDate,
    viewEndDate,
    selectedId,
    editingId,
    setSelectedId,
    setEditingId,
    deleteItem,
    undo,
    redo,
    theme,
    viewMode,
    addTask,
  } = useGanttStore();

  const rightScrollRef = useRef<HTMLDivElement>(null);

  const [showAddUncategorizedModal, setShowAddUncategorizedModal] = useState(false);
  const [newUncategorizedTaskName, setNewUncategorizedTaskName] = useState('');

  const handleCloseModal = () => {
    setShowAddUncategorizedModal(false);
    setNewUncategorizedTaskName('');
  };

  const handleSaveUncategorizedTask = () => {
    if (newUncategorizedTaskName.trim()) {
      addTask('feature_uncategorized', newUncategorizedTaskName.trim());
      handleCloseModal();
    }
  };

  // Compute total timeline width based on headers
  const { totalWidth } = useMemo(() => {
    return generateHeaders(viewStartDate, viewEndDate, zoom);
  }, [viewStartDate, viewEndDate, zoom]);

  const flatRows = getFlatRows();

  // Scroll to Today action
  const handleScrollToToday = () => {
    if (rightScrollRef.current) {
      const todayStr = formatDateStr(new Date());
      const x = dateToX(todayStr, viewStartDate, zoom);
      const dayWidth = ZOOM_CONFIG[zoom].dayWidth;
      
      // Align today leaving 1 day of margin on the left and reset vertical scroll
      rightScrollRef.current.scrollTo({
        left: x - dayWidth,
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  // Scroll to today on mount and when switching back to timeline view
  useEffect(() => {
    if (viewMode === 'timeline') {
      const timer = setTimeout(() => {
        handleScrollToToday();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [zoom, viewMode]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If currently editing inside an input, ignore global keys
      if (editingId) return;

      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      // Q key opens the add uncategorized task modal
      if (e.key.toLowerCase() === 'q' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowAddUncategorizedModal(true);
        return;
      }

      // Undo/Redo: Ctrl+Z / Ctrl+Y
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          undo();
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          redo();
        }
        return;
      }

      // Delete key: deletes selected item
      if (e.key === 'Delete') {
        if (selectedId) {
          const item = flatRows.find((r) => r.id === selectedId);
          if (item) {
            e.preventDefault();
            if (confirm(`Delete selected ${item.type} "${item.name}"?`)) {
              deleteItem(item.id, item.type);
            }
          }
        }
      }

      // Enter key: edit selected item
      if (e.key === 'Enter') {
        if (selectedId && !editingId) {
          e.preventDefault();
          setEditingId(selectedId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, editingId, flatRows, undo, redo, deleteItem, setEditingId, addTask]);

  // Click outside to deselect
  const handleWorkspaceClick = (e: React.MouseEvent) => {
    // If the click is on the main scrollable elements and not on row rows
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('timeline-grid-overlay')) {
      setSelectedId(null);
      setEditingId(null);
    }
  };

  return (
    <div className={`w-screen h-screen flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 ${theme}`}>
      {/* Top Toolbar */}
      <Toolbar onScrollToToday={handleScrollToToday} />

      {/* Main Split workspace */}
      <div 
        onClick={handleWorkspaceClick}
        className="flex-1 flex overflow-hidden relative timeline-grid-overlay"
      >
        {viewMode === 'timeline' ? (
          <VirtualList
            items={flatRows}
            rowHeight={40}
            headerHeight={56}
            rightScrollRef={rightScrollRef}
            timelineWidth={totalWidth}
            renderLeftRow={(item) => <TreeRow item={item} />}
            renderRightRow={(item) => <TimelineRow item={item} />}
            renderHeader={() => (
              <TimelineHeader
                viewStartDate={viewStartDate}
                viewEndDate={viewEndDate}
                zoom={zoom}
              />
            )}
          />
        ) : (
          <KanbanBoard />
        )}

        {/* Floating background grids and today line renderer inside VirtualList is automatic.
            However, we overlay the TodayIndicator at the root of the grid to make it span the entire scroll area. */}
        {viewMode === 'timeline' && rightScrollRef.current && (
          <div className="absolute pointer-events-none inset-0" style={{ left: 400 }}>
            {/* The actual Today indicator line is rendered in the Scroll Sync timeline component directly for correct alignment */}
          </div>
        )}
      </div>

      {/* Render Today indicator inside right scroll body */}
      <div className="hidden">
        {/* Helper representation */}
      </div>

      {/* Uncategorized Task creation modal triggered by Q key */}
      {showAddUncategorizedModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200 glass-panel">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1">
              Add Uncategorized Task
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 font-semibold">
              This task will be added to the backlog and can be dragged onto a feature on the Gantt chart.
            </p>
            <input
              type="text"
              autoFocus
              placeholder="Task name..."
              value={newUncategorizedTaskName}
              onChange={(e) => setNewUncategorizedTaskName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveUncategorizedTask();
                } else if (e.key === 'Escape') {
                  handleCloseModal();
                }
              }}
              className="w-full bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-950 dark:text-white mb-5 font-semibold placeholder-zinc-400"
            />
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-xs font-bold text-zinc-550 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUncategorizedTask}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm shadow-indigo-600/20 hover:scale-102 active:scale-98 transition-all cursor-pointer"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
