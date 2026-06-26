import React, { useState } from 'react';
import { FiX, FiCheck, FiSettings } from 'react-icons/fi';
import { useGanttStore } from '../store/ganttStore';

const PALETTE = [
  { hex: '#3b82f6', name: 'Blue' },
  { hex: '#6366f1', name: 'Indigo' },
  { hex: '#8b5cf6', name: 'Violet' },
  { hex: '#a855f7', name: 'Purple' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#f43f5e', name: 'Rose' },
  { hex: '#f97316', name: 'Orange' },
  { hex: '#f59e0b', name: 'Amber' },
  { hex: '#eab308', name: 'Yellow' },
  { hex: '#84cc16', name: 'Lime' },
  { hex: '#22c55e', name: 'Green' },
  { hex: '#10b981', name: 'Emerald' },
  { hex: '#14b8a6', name: 'Teal' },
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#0ea5e9', name: 'Sky' },
  { hex: '#64748b', name: 'Slate' },
  { hex: '#6b7280', name: 'Gray' },
  { hex: '#ef4444', name: 'Red' },
];

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full border-2 border-white dark:border-zinc-800 shadow-md ring-1 ring-zinc-200 dark:ring-zinc-700"
            style={{ backgroundColor: value }}
          />
          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{value}</span>
        </div>
      </div>

      {/* Circular palette swatches */}
      <div className="flex flex-wrap gap-2 mb-3">
        {PALETTE.map((color) => {
          const isSelected = value.toLowerCase() === color.hex.toLowerCase();
          return (
            <button
              key={color.hex}
              title={color.name}
              onClick={() => onChange(color.hex)}
              className="relative w-8 h-8 rounded-full transition-transform duration-150 hover:scale-110 focus:outline-none"
              style={{
                backgroundColor: color.hex,
                boxShadow: isSelected
                  ? `0 0 0 2px white, 0 0 0 4px ${color.hex}`
                  : '0 1px 3px rgba(0,0,0,0.3)',
              }}
            >
              {isSelected && (
                <span className="absolute inset-0 flex items-center justify-center text-white text-[10px]">
                  <FiCheck strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}

        {/* Custom color picker swatch */}
        <label
          title="Custom color"
          className="relative w-8 h-8 rounded-full cursor-pointer flex items-center justify-center transition-transform duration-150 hover:scale-110 overflow-hidden border-2 border-dashed border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-800"
          style={{
            background: !PALETTE.find(p => p.hex.toLowerCase() === value.toLowerCase())
              ? value
              : undefined,
            boxShadow: !PALETTE.find(p => p.hex.toLowerCase() === value.toLowerCase())
              ? `0 0 0 2px white, 0 0 0 4px ${value}`
              : undefined,
          }}
        >
          <span className="text-zinc-400 dark:text-zinc-500 text-[10px] font-bold leading-none select-none">+</span>
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </label>
      </div>
    </div>
  );
};

export const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const {
    defaultFeatureColor,
    defaultTaskColor,
    applyColorToAll,
  } = useGanttStore();

  const [featureColor, setFeatureColor] = useState(
    defaultFeatureColor.startsWith('#') ? defaultFeatureColor : '#3b82f6'
  );
  const [taskColor, setTaskColor] = useState(
    defaultTaskColor.startsWith('#') ? defaultTaskColor : '#10b981'
  );

  const handleSave = () => {
    applyColorToAll(featureColor, taskColor);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-[420px] p-6 relative border border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Close Settings"
        >
          <FiX size={18} />
        </button>

        <h2 className="text-base font-bold mb-1 text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
          <FiSettings className="text-indigo-500" />
          Color Settings
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
          Changes apply to <span className="font-semibold text-zinc-700 dark:text-zinc-300">all existing</span> features and tasks.
        </p>

        <div className="space-y-6">
          <ColorPicker
            label="Feature Color"
            value={featureColor}
            onChange={setFeatureColor}
          />

          <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

          <ColorPicker
            label="Task Color"
            value={taskColor}
            onChange={setTaskColor}
          />

          {/* Live preview */}
          <div>
            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mb-2 uppercase tracking-widest">
              Preview
            </p>
            <div className="flex flex-col gap-2 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
              <div
                className="h-7 rounded-md flex items-center px-3 text-white text-[11px] font-bold shadow-sm"
                style={{ backgroundColor: featureColor + 'cc' }}
              >
                Feature bar
              </div>
              <div
                className="h-7 rounded-md flex items-center px-3 text-white text-[11px] font-bold shadow-sm"
                style={{ backgroundColor: taskColor + 'cc' }}
              >
                Task bar
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6 gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <FiCheck size={14} />
            Apply to All
          </button>
        </div>
      </div>
    </div>
  );
};
