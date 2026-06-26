import React, { useMemo, useState } from 'react';
import { useGanttStore } from '../store/ganttStore';
import type { FlatRow } from '../types/gantt';
import { generateHeaders, dateToX, formatDateStr, xToDateStr, parseDate } from '../utils/dateUtils';
import { TaskBar } from './TaskBar';
import { addDays } from 'date-fns';

interface TimelineHeaderProps {
  viewStartDate: string;
  viewEndDate: string;
  zoom: 'days' | 'weeks' | 'months';
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  viewStartDate,
  viewEndDate,
  zoom,
}) => {
  const { primary, secondary } = useMemo(() => {
    return generateHeaders(viewStartDate, viewEndDate, zoom);
  }, [viewStartDate, viewEndDate, zoom]);

  return (
    <div className="h-full flex flex-col relative text-[10px] font-bold text-zinc-500 dark:text-zinc-400 select-none">
      {/* Primary Header Row (Months / Years) */}
      <div className="h-7 border-b border-zinc-200 dark:border-zinc-800 flex items-center relative overflow-hidden bg-zinc-100 dark:bg-zinc-900">
        {primary.map((cell, idx) => (
          <div
            key={`p_${idx}`}
            style={{
              position: 'absolute',
              left: cell.left,
              width: cell.width,
            }}
            className="h-full flex items-center px-2 border-r border-zinc-200 dark:border-zinc-800 truncate"
          >
            {cell.label}
          </div>
        ))}
      </div>

      {/* Secondary Header Row (Days / Weeks / Months) */}
      <div className="h-7 flex items-center relative overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/50">
        {secondary.map((cell, idx) => (
          <div
            key={`s_${idx}`}
            style={{
              position: 'absolute',
              left: cell.left,
              width: cell.width,
            }}
            className="h-full flex flex-col justify-center items-center border-r border-zinc-200/50 dark:border-zinc-800/40 truncate"
          >
            <span>{cell.label}</span>
            {cell.subLabel && <span className="opacity-60 text-[8px] font-medium leading-none">{cell.subLabel}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

interface TimelineGridProps {
  viewStartDate: string;
  viewEndDate: string;
  zoom: 'days' | 'weeks' | 'months';
  height: number;
}

export const TimelineGrid: React.FC<TimelineGridProps> = React.memo(({
  viewStartDate,
  viewEndDate,
  zoom,
}) => {
  const { secondary } = useMemo(() => {
    return generateHeaders(viewStartDate, viewEndDate, zoom);
  }, [viewStartDate, viewEndDate, zoom]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0">
      {/* Vertical Column Borders */}
      {secondary.map((cell, idx) => (
        <div
          key={`grid_col_${idx}`}
          style={{
            position: 'absolute',
            left: cell.left,
            width: cell.width,
            top: 0,
            bottom: 0,
          }}
          className="border-r border-zinc-200/20 dark:border-zinc-800/20 h-full"
        />
      ))}
    </div>
  );
});

TimelineGrid.displayName = 'TimelineGrid';

interface TodayIndicatorProps {
  viewStartDate: string;
  zoom: 'days' | 'weeks' | 'months';
  totalWidth: number;
}

export const TodayIndicator: React.FC<TodayIndicatorProps> = ({
  viewStartDate,
  zoom,
  totalWidth,
}) => {
  const todayStr = useMemo(() => formatDateStr(new Date()), []);
  const todayX = useMemo(() => {
    return dateToX(todayStr, viewStartDate, zoom);
  }, [todayStr, viewStartDate, zoom]);

  if (todayX < 0 || todayX > totalWidth) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: todayX,
        top: 0,
        bottom: 0,
      }}
      className="w-px bg-red-500 z-10 pointer-events-none"
    >
      <div className="absolute top-0 transform -translate-x-1/2 bg-red-500 text-white font-bold text-[8px] px-1 rounded shadow-sm py-0.5 select-none whitespace-nowrap">
        Today
      </div>
    </div>
  );
};

interface TimelineRowProps {
  item: FlatRow;
}

export const TimelineRow: React.FC<TimelineRowProps> = React.memo(({ item }) => {
  const { 
    selectedId, 
    setSelectedId, 
    moveTaskToFeature, 
    updateTaskDates, 
    viewStartDate, 
    zoom 
  } = useGanttStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const isSelected = selectedId === item.id;

  const bgHighlightClass = isSelected
    ? 'bg-indigo-500/5 dark:bg-indigo-500/10'
    : 'hover:bg-zinc-100/30 dark:hover:bg-zinc-900/30';

  const dragOverClass = isDragOver
    ? 'bg-indigo-500/10 ring-2 ring-indigo-500/20 z-20'
    : '';

  const handleDragOver = (e: React.DragEvent) => {
    if (item.type === 'feature' || item.type === 'task') {
      e.preventDefault();
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (item.type !== 'feature' && item.type !== 'task') return;
    e.preventDefault();
    setIsDragOver(false);

    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;

    // Calculate drop coordinate relative to the timeline row container
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX;
    const relativeX = clientX - rect.left;

    // Convert coordinate to date string
    const startDateStr = xToDateStr(relativeX, viewStartDate, zoom);

    // Resolve target feature ID: if task, use its parentId
    const targetFeatureId = item.type === 'feature' ? item.id : item.parentId;
    if (!targetFeatureId) return;

    // Get task information from store
    const task = useGanttStore.getState().tasks[taskId];
    if (task) {
      const duration = task.duration || 1;
      const dueDateStr = formatDateStr(addDays(parseDate(startDateStr), duration - 1));

      // Move task to this feature
      moveTaskToFeature(taskId, targetFeatureId);
      // Snap task dates to the drop location on timeline
      updateTaskDates(taskId, startDateStr, dueDateStr);
    }
  };

  return (
    <div
      onClick={() => setSelectedId(item.id)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`h-full w-full border-b border-zinc-200/50 dark:border-zinc-800/40 relative transition-all ${bgHighlightClass} ${dragOverClass}`}
    >
      {/* Gantt Bar rendering */}
      <TaskBar item={item} />
    </div>
  );
});

TimelineRow.displayName = 'TimelineRow';
