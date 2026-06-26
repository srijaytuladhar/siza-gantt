import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { FlatRow } from '../types/gantt';
import { useGanttStore } from '../store/ganttStore';
import { TimelineGrid, TodayIndicator } from './GanttTimeline';

interface VirtualListProps {
  items: FlatRow[];
  rowHeight: number;
  headerHeight: number;
  renderLeftRow: (item: FlatRow) => React.ReactNode;
  renderRightRow: (item: FlatRow) => React.ReactNode;
  renderHeader: () => React.ReactNode;
  timelineWidth: number;
  rightScrollRef: React.RefObject<HTMLDivElement | null>;
}

export const VirtualList: React.FC<VirtualListProps> = ({
  items,
  rowHeight,
  headerHeight,
  renderLeftRow,
  renderRightRow,
  renderHeader,
  timelineWidth,
  rightScrollRef,
}) => {
  const { viewStartDate, viewEndDate, zoom } = useGanttStore();
  const leftScrollRef = useRef<HTMLDivElement>(null);

  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(500);

  // Resize listener to capture viewport height
  useEffect(() => {
    const handleResize = () => {
      if (rightScrollRef.current) {
        setViewportHeight(rightScrollRef.current.clientHeight - headerHeight);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [headerHeight]);

  // Synchronize scrolls
  const handleRightScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
    if (leftScrollRef.current) {
      leftScrollRef.current.scrollTop = target.scrollTop;
    }
  }, []);

  // Forward wheel events from the left pane (tree) to the right pane (timeline)
  const handleLeftWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (rightScrollRef.current) {
      rightScrollRef.current.scrollTop += e.deltaY;
    }
  }, []);

  // Calculate rendering range
  const totalHeight = items.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 5);
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + 5);

  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div className="flex flex-1 w-full overflow-hidden select-none bg-zinc-50 dark:bg-zinc-950">
      
      {/* LEFT SIDE: Hierarchy Tree */}
      <div className="w-[360px] md:w-[400px] shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/40">
        
        {/* Left Header Spacer */}
        <div 
          style={{ height: headerHeight }} 
          className="border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 bg-zinc-100/80 dark:bg-zinc-900/80 text-xs font-semibold text-zinc-500 uppercase tracking-wider sticky top-0 z-10"
        >
          Hierarchy / Scope Tree
        </div>

        {/* Left Scroll Container (no scrollbars visible, wheels to right container) */}
        <div
          ref={leftScrollRef}
          onWheel={handleLeftWheel}
          className="flex-1 overflow-y-hidden overflow-x-auto relative"
        >
          <div style={{ height: totalHeight }} className="w-full relative">
            {visibleItems.map((item, idx) => {
              const actualIdx = startIndex + idx;
              return (
                <div
                  key={item.id}
                  style={{
                    position: 'absolute',
                    top: actualIdx * rowHeight,
                    height: rowHeight,
                    left: 0,
                    right: 0,
                  }}
                  className="w-full"
                >
                  {renderLeftRow(item)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Interactive Timeline */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Right Scroll Container (Scrolls vertically & horizontally) */}
        <div
          ref={rightScrollRef}
          onScroll={handleRightScroll}
          className="flex-1 overflow-auto relative"
        >
          {/* Header (sticky to top, but scrolls horizontally with grid width) */}
          <div 
            style={{ 
              height: headerHeight,
              width: timelineWidth,
            }}
            className="sticky top-0 z-20 bg-zinc-100/90 dark:bg-zinc-900/95 border-b border-zinc-200 dark:border-zinc-800 backdrop-blur-sm"
          >
            {renderHeader()}
          </div>

          {/* Timeline Grid & Task Bars Container */}
          <div 
            style={{ 
              height: totalHeight,
              width: timelineWidth,
            }}
            className="relative"
          >
            {/* Background Grid lines */}
            <TimelineGrid
              viewStartDate={viewStartDate}
              viewEndDate={viewEndDate}
              zoom={zoom}
              height={totalHeight}
            />

            {/* Red Today indicator vertical overlay */}
            <TodayIndicator
              viewStartDate={viewStartDate}
              zoom={zoom}
              totalWidth={timelineWidth}
            />

            {/* Grid & other timeline items go here */}
            {visibleItems.map((item, idx) => {
              const actualIdx = startIndex + idx;
              return (
                <div
                  key={item.id}
                  style={{
                    position: 'absolute',
                    top: actualIdx * rowHeight,
                    height: rowHeight,
                    left: 0,
                    width: timelineWidth,
                  }}
                >
                  {renderRightRow(item)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
