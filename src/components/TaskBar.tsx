import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useGanttStore } from '../store/ganttStore';
import type { FlatRow } from '../types/gantt';
import { dateToX, xToDateStr, parseDate, formatDateStr, getDaysCount, ZOOM_CONFIG } from '../utils/dateUtils';
import { addDays } from 'date-fns';

interface TaskBarProps {
  item: FlatRow;
}

const LONG_PRESS_DURATION = 480; // ms before drag activates on touch

export const TaskBar: React.FC<TaskBarProps> = React.memo(({ item }) => {
  if (item.id === 'project_uncategorized' || item.parentId === 'project_uncategorized') {
    return null;
  }

  const {
    zoom,
    viewStartDate,
    updateTaskDates,
    moveFeature,
    selectedId,
    setSelectedId,
    defaultTaskColor,
    defaultFeatureColor,
  } = useGanttStore();

  const dragRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [longPressActive, setLongPressActive] = useState(false); // visual feedback before drag starts

  // Local drag offsets to render smooth 60fps movement
  const [dragStyle, setDragStyle] = useState<{ left?: number; width?: number } | null>(null);

  const dayWidth = ZOOM_CONFIG[zoom].dayWidth;

  // Calculate coordinates
  const leftX = dateToX(item.startDate, viewStartDate, zoom);
  const spanDays = getDaysCount(item.startDate, item.dueDate);
  const widthX = spanDays * dayWidth;

  const currentLeft = dragStyle?.left ?? leftX;
  const currentWidth = dragStyle?.width ?? widthX;

  const isSelected = selectedId === item.id;
  const isDraggable = item.type === 'task' || item.type === 'feature';
  const isTask = item.type === 'task';

  // Pointer drag/resize state
  const dragStartInfo = useRef<{
    startX: number;
    initialLeft: number;
    initialWidth: number;
    pointerId: number;
    isTouch: boolean;
  } | null>(null);

  // Long-press timer ref
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchDragEnabled = useRef(false); // set to true after long press completes
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  // ─── Shared activate-drag logic ───────────────────────────────────────────
  const activateDrag = useCallback((
    pointerId: number,
    clientX: number,
    el: HTMLElement,
    isTouch: boolean,
  ) => {
    try { el.setPointerCapture(pointerId); } catch {}
    dragStartInfo.current = {
      startX: clientX,
      initialLeft: leftX,
      initialWidth: widthX,
      pointerId,
      isTouch,
    };
    setIsDragging(true);
    setLongPressActive(false);

    // Haptic feedback on Android if available
    if (isTouch && 'vibrate' in navigator) {
      navigator.vibrate(40);
    }
  }, [leftX, widthX]);

  // ─── POINTER DOWN ─────────────────────────────────────────────────────────
  const handlePointerDown = useCallback((
    e: React.PointerEvent<HTMLDivElement>,
    type: 'drag' | 'left' | 'right',
  ) => {
    e.stopPropagation();
    setSelectedId(item.id);

    if (item.type === 'project') return;
    if (type !== 'drag' && item.type !== 'task') return;

    const isTouch = e.pointerType === 'touch';
    const el = e.currentTarget;

    if (isTouch && type === 'drag' && isDraggable) {
      // On touch: record start position, wait for long press
      touchStartPos.current = { x: e.clientX, y: e.clientY };
      touchDragEnabled.current = false;

      setLongPressActive(false);

      // Start long-press timer
      longPressTimer.current = setTimeout(() => {
        touchDragEnabled.current = true;
        setLongPressActive(true);

        // Immediately start drag from the current touch position
        activateDrag(e.pointerId, touchStartPos.current?.x ?? e.clientX, el, true);
      }, LONG_PRESS_DURATION);

      // Capture pointer so we get move/up even outside element
      try { el.setPointerCapture(e.pointerId); } catch {}
      return;
    }

    // Desktop (mouse): start drag immediately
    try { el.setPointerCapture(e.pointerId); } catch {}
    dragStartInfo.current = {
      startX: e.clientX,
      initialLeft: leftX,
      initialWidth: widthX,
      pointerId: e.pointerId,
      isTouch: false,
    };
    if (type === 'drag') setIsDragging(true);
    if (type === 'left') setIsResizingLeft(true);
    if (type === 'right') setIsResizingRight(true);
  }, [item.id, item.type, isDraggable, leftX, widthX, activateDrag, setSelectedId]);

  // ─── POINTER MOVE ─────────────────────────────────────────────────────────
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // If touch and long press not yet fired: check if finger moved too much (cancel long press)
    if (e.pointerType === 'touch' && !touchDragEnabled.current) {
      const start = touchStartPos.current;
      if (start) {
        const dx = Math.abs(e.clientX - start.x);
        const dy = Math.abs(e.clientY - start.y);
        if (dx > 8 || dy > 8) {
          // Finger moved — cancel long press, let scroll happen
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
          setLongPressActive(false);
        }
      }
      return;
    }

    if (!dragStartInfo.current) return;
    e.stopPropagation();

    const info = dragStartInfo.current;
    const deltaX = e.clientX - info.startX;

    if (isDragging) {
      const rawLeft = info.initialLeft + deltaX;
      const snappedLeft = Math.round(rawLeft / dayWidth) * dayWidth;
      setDragStyle({ left: snappedLeft, width: info.initialWidth });

      if (item.type === 'task') {
        const startStr = xToDateStr(snappedLeft, viewStartDate, zoom);
        const days = getDaysCount(item.startDate, item.dueDate);
        const dueStr = formatDateStr(addDays(parseDate(startStr), days - 1));
        updateTaskDates(item.id, startStr, dueStr);
      }
    } else if (isResizingLeft && item.type === 'task') {
      const rawLeft = info.initialLeft + deltaX;
      const maxLeft = info.initialLeft + info.initialWidth - dayWidth;
      const snappedLeft = Math.min(maxLeft, Math.round(rawLeft / dayWidth) * dayWidth);
      const newWidth = info.initialWidth + (info.initialLeft - snappedLeft);
      const startStr = xToDateStr(snappedLeft, viewStartDate, zoom);
      setDragStyle({ left: snappedLeft, width: newWidth });
      updateTaskDates(item.id, startStr, item.dueDate);
    } else if (isResizingRight && item.type === 'task') {
      const rawWidth = info.initialWidth + deltaX;
      const snappedWidth = Math.max(dayWidth, Math.round(rawWidth / dayWidth) * dayWidth);
      const dueStr = xToDateStr(info.initialLeft + snappedWidth - dayWidth, viewStartDate, zoom);
      setDragStyle({ left: info.initialLeft, width: snappedWidth });
      updateTaskDates(item.id, item.startDate, dueStr);
    }
  }, [isDragging, isResizingLeft, isResizingRight, dayWidth, item, viewStartDate, zoom, updateTaskDates]);

  // ─── POINTER UP ───────────────────────────────────────────────────────────
  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Always cancel the long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchDragEnabled.current = false;
    touchStartPos.current = null;
    setLongPressActive(false);

    if (!dragStartInfo.current) return;
    e.stopPropagation();

    const el = e.currentTarget;
    try { el.releasePointerCapture(dragStartInfo.current.pointerId); } catch {}

    if (isDragging && item.type === 'feature' && dragStyle) {
      const finalLeft = dragStyle.left ?? leftX;
      const deltaDays = Math.round((finalLeft - leftX) / dayWidth);
      if (deltaDays !== 0) {
        moveFeature(item.id, deltaDays);
      }
    }

    dragStartInfo.current = null;
    setIsDragging(false);
    setIsResizingLeft(false);
    setIsResizingRight(false);
    setDragStyle(null);
  }, [isDragging, dragStyle, leftX, dayWidth, item.id, item.type, moveFeature]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  // ─── Color ────────────────────────────────────────────────────────────────
  const getBarHexColor = (): string => {
    if (item.type === 'project') {
      const projectColorMap: Record<string, string> = {
        slate: '#64748b', blue: '#3b82f6', indigo: '#6366f1', violet: '#8b5cf6',
        purple: '#a855f7', pink: '#ec4899', rose: '#f43f5e', orange: '#f97316',
        amber: '#f59e0b', yellow: '#eab308', lime: '#84cc16', green: '#22c55e',
        emerald: '#10b981', teal: '#14b8a6', cyan: '#06b6d4', sky: '#0ea5e9',
      };
      return projectColorMap[item.color || 'slate'] || '#64748b';
    }
    if (item.type === 'feature') {
      if (item.color && item.color.startsWith('#')) return item.color;
      const featureColorMap: Record<string, string> = {
        blue: '#3b82f6', cyan: '#06b6d4', emerald: '#10b981', violet: '#8b5cf6',
        amber: '#f59e0b', rose: '#f43f5e', pink: '#ec4899', indigo: '#6366f1',
        orange: '#f97316', slate: '#64748b',
      };
      if (item.color && featureColorMap[item.color]) return featureColorMap[item.color];
      return defaultFeatureColor || '#3b82f6';
    }
    if (item.color && item.color.startsWith('#')) return item.color;
    return defaultTaskColor || '#10b981';
  };

  const barHex = getBarHexColor();
  const isActive = isDragging || isResizingLeft || isResizingRight;

  return (
    <div
      ref={dragRef}
      style={{
        position: 'absolute',
        left: currentLeft,
        width: currentWidth,
        height: '65%',
        top: '17.5%',
        backgroundColor: barHex + 'cc',
        borderRadius: '6px',
        border: isSelected ? '2px solid #6366f1' : `1px solid ${barHex}`,
        boxShadow: isSelected
          ? '0 0 0 2px #6366f1, 0 0 0 4px rgba(99,102,241,0.25)'
          : longPressActive
          ? `0 0 0 3px ${barHex}, 0 0 12px 2px ${barHex}88` // glow on long-press ready
          : undefined,
        zIndex: isSelected || isActive ? 20 : undefined,
        // Scale up slightly when long-press is charging
        transform: longPressActive ? 'scaleY(1.12)' : undefined,
        transition: longPressActive
          ? 'box-shadow 0.15s ease, transform 0.15s ease'
          : 'box-shadow 0.1s ease',
        touchAction: 'none', // prevent browser scroll interference during drag
      }}
      className={`select-none flex items-center relative group ${
        isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      } ${isActive ? 'shadow-md' : 'shadow-sm'}`}
      onPointerDown={(e) => isDraggable && handlePointerDown(e, 'drag')}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Resizer Left Handle */}
      {isTask && (
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            handlePointerDown(e, 'left');
          }}
          className="absolute left-0 top-0 bottom-0 w-2 hover:w-3 cursor-ew-resize rounded-l-md hover:bg-black/10 active:bg-black/20 z-10"
        />
      )}

      {/* Long-press ripple ring animation */}
      {longPressActive && (
        <div
          className="absolute inset-0 rounded-md pointer-events-none"
          style={{
            animation: 'none',
            background: 'rgba(255,255,255,0.15)',
          }}
        />
      )}

      {/* Zigzag pattern for Done Tasks */}
      {isTask && item.status === 'done' && (
        <div
          className="absolute inset-0 pointer-events-none rounded-md opacity-40 z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath d='M0 8 L4 4 L8 8 L12 4 L16 8 L16 12 L12 8 L8 12 L4 8 L0 12 Z' fill='%23ffffff'/%3E%3C/svg%3E")`,
            backgroundSize: '16px 16px',
            backgroundRepeat: 'repeat',
          }}
        />
      )}

      {/* Dotted pattern for Projects */}
      {item.type === 'project' && (
        <div
          className="absolute inset-0 pointer-events-none rounded-md opacity-40 z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Ccircle cx='4' cy='4' r='1.5' fill='%23ffffff'/%3E%3C/svg%3E")`,
            backgroundSize: '8px 8px',
            backgroundRepeat: 'repeat',
          }}
        />
      )}

      {/* Bar Content */}
      <span className="text-[10px] font-bold text-white px-2 truncate w-full pointer-events-none drop-shadow-sm select-none z-10">
        {item.name} {isTask && `(${item.duration}d)`}
      </span>

      {/* Floating Status Chip */}
      {isTask && (
        <span className={`absolute -top-2.5 -right-1 text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded shadow-sm shrink-0 z-30 select-none pointer-events-none ${
          item.status === 'done'
            ? 'bg-emerald-500 text-white border border-emerald-400 dark:bg-emerald-600 dark:border-emerald-500'
            : item.status === 'in_progress'
            ? 'bg-amber-500 text-white border border-amber-400 dark:bg-amber-600 dark:border-amber-500'
            : 'bg-zinc-500 text-white border border-zinc-400 dark:bg-zinc-650 dark:border-zinc-550'
        }`}>
          {item.status === 'done' ? 'Done' : item.status === 'in_progress' ? 'In Progress' : 'To Do'}
        </span>
      )}

      {/* Date Tooltip on Hover/Drag */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
        <div className="bg-zinc-900 text-white text-[9px] font-semibold py-1 px-2 rounded shadow-lg whitespace-nowrap dark:bg-zinc-800 border border-zinc-700/50">
          {item.startDate} to {item.dueDate}
        </div>
        <div className="w-1.5 h-1.5 bg-zinc-900 dark:bg-zinc-800 transform rotate-45 -mt-1" />
      </div>

      {/* Resizer Right Handle */}
      {isTask && (
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            handlePointerDown(e, 'right');
          }}
          className="absolute right-0 top-0 bottom-0 w-2 hover:w-3 cursor-ew-resize rounded-r-md hover:bg-black/10 active:bg-black/20 z-10"
        />
      )}
    </div>
  );
});

TaskBar.displayName = 'TaskBar';
