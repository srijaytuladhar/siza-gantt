import { create } from 'zustand';
import type { Project, Feature, Task, ZoomLevel, FlatRow, TaskStatus } from '../types/gantt';
import { parseDate, formatDateStr, getDaysCount } from '../utils/dateUtils';
import { addDays } from 'date-fns';
import { supabase } from '../utils/supabaseClient';

interface GanttState {
  projects: Record<string, Project>;
  features: Record<string, Feature>;
  tasks: Record<string, Task>;
  projectIds: string[];
  
  // UI State
  zoom: ZoomLevel;
  theme: 'light' | 'dark';
  selectedId: string | null;
  editingId: string | null;
  viewStartDate: string;
  viewEndDate: string;
  supabaseConnected: boolean;
  isLoading: boolean;
  viewMode: 'timeline' | 'kanban';
  
  // Actions
  initSupabase: () => Promise<void>;
  setViewMode: (mode: 'timeline' | 'kanban') => void;
  setTaskStatus: (taskId: string, status: TaskStatus) => void;
  addProject: (name: string) => void;
  addFeature: (projectId: string, name: string) => void;
  addTask: (featureId: string, name: string, start?: string, due?: string) => void;
  deleteItem: (id: string, type: 'project' | 'feature' | 'task') => void;
  renameItem: (id: string, type: 'project' | 'feature' | 'task', newName: string) => void;
  toggleCollapse: (id: string, type: 'project' | 'feature') => void;
  updateTaskDates: (taskId: string, startStr: string, dueStr: string) => void;
  moveFeature: (featureId: string, deltaDays: number) => void;
  setFeatureColor: (featureId: string, color: string) => void;
  setZoom: (zoom: ZoomLevel) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setSelectedId: (id: string | null) => void;
  setEditingId: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  loadSampleData: () => void;
  loadHugeData: () => void;
  clearAll: () => void;
  moveTaskToFeature: (taskId: string, targetFeatureId: string) => Promise<void>;
  moveTaskToUncategorized: (taskId: string) => Promise<void>;
  
  // Computed (Helper for components)
  getFlatRows: () => FlatRow[];
}

interface HistoryItem {
  projects: Record<string, Project>;
  features: Record<string, Feature>;
  tasks: Record<string, Task>;
  projectIds: string[];
}

const LOCAL_STORAGE_KEY = 'apex_gantt_state_v1';

// Helper to calculate parent dates based on children
const recalculateDates = (
  projects: Record<string, Project>,
  features: Record<string, Feature>,
  tasks: Record<string, Task>
) => {
  const newFeatures = { ...features };
  const newProjects = { ...projects };

  // Recalculate features first
  Object.keys(newFeatures).forEach((fId) => {
    const feature = newFeatures[fId];
    const childTasks = feature.taskIds.map((tId) => tasks[tId]).filter(Boolean);

    if (childTasks.length > 0) {
      let minStart = parseDate(childTasks[0].startDate);
      let maxDue = parseDate(childTasks[0].dueDate);

      childTasks.forEach((t) => {
        const start = parseDate(t.startDate);
        const due = parseDate(t.dueDate);
        if (start < minStart) minStart = start;
        if (due > maxDue) maxDue = due;
      });

      newFeatures[fId] = {
        ...feature,
        startDate: formatDateStr(minStart),
        dueDate: formatDateStr(maxDue),
        duration: getDaysCount(formatDateStr(minStart), formatDateStr(maxDue)),
      };
    } else {
      // default fallback
      const todayStr = formatDateStr(new Date());
      newFeatures[fId] = {
        ...feature,
        startDate: todayStr,
        dueDate: todayStr,
        duration: 1,
      };
    }
  });

  // Recalculate projects
  Object.keys(newProjects).forEach((pId) => {
    const project = newProjects[pId];
    const childFeatures = project.featureIds.map((fId) => newFeatures[fId]).filter(Boolean);

    if (childFeatures.length > 0) {
      let minStart = parseDate(childFeatures[0].startDate);
      let maxDue = parseDate(childFeatures[0].dueDate);

      childFeatures.forEach((f) => {
        const start = parseDate(f.startDate);
        const due = parseDate(f.dueDate);
        if (start < minStart) minStart = start;
        if (due > maxDue) maxDue = due;
      });

      newProjects[pId] = {
        ...project,
        startDate: formatDateStr(minStart),
        dueDate: formatDateStr(maxDue),
        duration: getDaysCount(formatDateStr(minStart), formatDateStr(maxDue)),
      };
    } else {
      const todayStr = formatDateStr(new Date());
      newProjects[pId] = {
        ...project,
        startDate: todayStr,
        dueDate: todayStr,
        duration: 1,
      };
    }
  });

  return { projects: newProjects, features: newFeatures };
};

// Initial empty/default state
const ensureUncategorizedExists = (
  projects: Record<string, Project>,
  features: Record<string, Feature>,
  projectIds: string[]
) => {
  const todayStr = formatDateStr(new Date());
  
  const updatedProjects = { ...projects };
  const updatedFeatures = { ...features };
  const updatedProjectIds = [...projectIds];

  if (!updatedProjects['project_uncategorized']) {
    updatedProjects['project_uncategorized'] = {
      id: 'project_uncategorized',
      name: 'Uncategorized Tasks',
      collapsed: false,
      startDate: todayStr,
      dueDate: todayStr,
      duration: 1,
      featureIds: ['feature_uncategorized'],
    };
  } else {
    if (!updatedProjects['project_uncategorized'].featureIds.includes('feature_uncategorized')) {
      updatedProjects['project_uncategorized'].featureIds = [
        ...updatedProjects['project_uncategorized'].featureIds.filter(id => id !== 'feature_uncategorized'),
        'feature_uncategorized'
      ];
    }
  }

  if (!updatedFeatures['feature_uncategorized']) {
    updatedFeatures['feature_uncategorized'] = {
      id: 'feature_uncategorized',
      parentId: 'project_uncategorized',
      name: 'Uncategorized Feature',
      collapsed: false,
      startDate: todayStr,
      dueDate: todayStr,
      duration: 1,
      tasks: [],
      taskIds: [],
    };
  }

  if (!updatedProjectIds.includes('project_uncategorized')) {
    updatedProjectIds.push('project_uncategorized');
  }

  return { projects: updatedProjects, features: updatedFeatures, projectIds: updatedProjectIds };
};

// Initial empty/default state
const getInitialState = () => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.projects && parsed.features && parsed.tasks) {
        const ensured = ensureUncategorizedExists(
          parsed.projects,
          parsed.features,
          parsed.projectIds || []
        );
        return {
          projects: ensured.projects,
          features: ensured.features,
          tasks: parsed.tasks,
          projectIds: ensured.projectIds,
          zoom: parsed.zoom || 'days',
          theme: parsed.theme || 'dark',
          viewStartDate: parsed.viewStartDate || '2026-05-01',
          viewEndDate: parsed.viewEndDate || '2026-10-31',
          viewMode: parsed.viewMode || 'timeline',
        };
      }
    }
  } catch (e) {
    console.error('Failed to parse localStorage state', e);
  }

  const ensured = ensureUncategorizedExists({}, {}, []);
  return {
    projects: ensured.projects,
    features: ensured.features,
    tasks: {},
    projectIds: ensured.projectIds,
    zoom: 'days' as ZoomLevel,
    theme: 'dark' as const,
    viewStartDate: formatDateStr(addDays(new Date(), -30)),
    viewEndDate: formatDateStr(addDays(new Date(), 90)),
    viewMode: 'timeline' as const,
  };
};

const savedState = getInitialState();

// Undo/redo history stacks
let historyStack: HistoryItem[] = [];
let redoStack: HistoryItem[] = [];

const pushHistory = (state: {
  projects: Record<string, Project>;
  features: Record<string, Feature>;
  tasks: Record<string, Task>;
  projectIds: string[];
}) => {
  historyStack.push({
    projects: JSON.parse(JSON.stringify(state.projects)),
    features: JSON.parse(JSON.stringify(state.features)),
    tasks: JSON.parse(JSON.stringify(state.tasks)),
    projectIds: [...state.projectIds],
  });
  if (historyStack.length > 50) historyStack.shift();
  redoStack = []; // Clear redo stack on new action
};

const saveToLocalStorage = (state: Partial<GanttState>) => {
  try {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        projects: state.projects,
        features: state.features,
        tasks: state.tasks,
        projectIds: state.projectIds,
        zoom: state.zoom,
        theme: state.theme,
        viewStartDate: state.viewStartDate,
        viewEndDate: state.viewEndDate,
        viewMode: state.viewMode,
      })
    );
  } catch (e) {
    console.error('Failed to save state to localStorage', e);
  }
};

export const useGanttStore = create<GanttState>((set, get) => ({
  projects: savedState.projects,
  features: savedState.features,
  tasks: savedState.tasks,
  projectIds: savedState.projectIds,
  zoom: savedState.zoom,
  theme: savedState.theme,
  selectedId: null,
  editingId: null,
  viewStartDate: savedState.viewStartDate,
  viewEndDate: savedState.viewEndDate,
  supabaseConnected: false,
  isLoading: false,
  viewMode: savedState.viewMode,

  initSupabase: async () => {
    set({ isLoading: true });
    try {
      // Query projects
      const { data: projData, error: projError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: true });

      if (projError) {
        console.warn('Supabase not fully ready or tables missing. Falling back to LocalStorage.', projError.message);
        set({ supabaseConnected: false, isLoading: false });
        // If local storage is empty, populate sample data
        if (get().projectIds.length === 0) {
          get().loadSampleData();
        }
        return;
      }

      // If we got here, projects table exists and query succeeded
      const { data: featData } = await supabase
        .from('features')
        .select('*')
        .order('created_at', { ascending: true });

      const { data: taskData } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: true });

      const loadedProjects: Record<string, Project> = {};
      const loadedFeatures: Record<string, Feature> = {};
      const loadedTasks: Record<string, Task> = {};
      const loadedProjectIds: string[] = [];

      // Parse projects
      if (projData) {
        projData.forEach((p: any) => {
          loadedProjectIds.push(p.id);
          loadedProjects[p.id] = {
            id: p.id,
            name: p.name,
            collapsed: p.collapsed ?? false,
            startDate: p.start_date || formatDateStr(new Date()),
            dueDate: p.due_date || formatDateStr(new Date()),
            duration: p.duration || 1,
            featureIds: [],
          };
        });
      }

      // Parse features
      if (featData) {
        featData.forEach((f: any) => {
          loadedFeatures[f.id] = {
            id: f.id,
            parentId: f.project_id,
            name: f.name,
            collapsed: f.collapsed ?? false,
            startDate: f.start_date || formatDateStr(new Date()),
            dueDate: f.due_date || formatDateStr(new Date()),
            duration: f.duration || 1,
            tasks: [],
            taskIds: [],
            color: f.color,
          };
          // Push to parent project
          if (loadedProjects[f.project_id]) {
            loadedProjects[f.project_id].featureIds.push(f.id);
          }
        });
      }

      // Parse tasks
      if (taskData) {
        taskData.forEach((t: any) => {
          loadedTasks[t.id] = {
            id: t.id,
            parentId: t.feature_id,
            name: t.name,
            startDate: t.start_date,
            dueDate: t.due_date,
            duration: t.duration,
            status: t.status || 'todo',
          };
          // Push to parent feature
          if (loadedFeatures[t.feature_id]) {
            loadedFeatures[t.feature_id].taskIds.push(t.id);
          }
        });
      }

      // Ensure uncategorized exists locally in the loaded structures
      const ensured = ensureUncategorizedExists(loadedProjects, loadedFeatures, loadedProjectIds);

      // Recalculate parent dates to be absolutely safe
      const recalculated = recalculateDates(ensured.projects, ensured.features, loadedTasks);

      set({
        projects: recalculated.projects,
        features: recalculated.features,
        tasks: loadedTasks,
        projectIds: ensured.projectIds,
        supabaseConnected: true,
        isLoading: false,
      });

      console.log('Supabase sync successful! Loaded', ensured.projectIds.length, 'projects.');

      // Ensure uncategorized project/feature exist in Supabase DB in the background
      const todayStr = formatDateStr(new Date());
      const { data: dbUncatProj } = await supabase.from('projects').select('id').eq('id', 'project_uncategorized');
      if (!dbUncatProj || dbUncatProj.length === 0) {
        await supabase.from('projects').insert({
          id: 'project_uncategorized',
          name: 'Uncategorized Tasks',
          collapsed: false,
          start_date: todayStr,
          due_date: todayStr,
          duration: 1,
        });
      }
      const { data: dbUncatFeat } = await supabase.from('features').select('id').eq('id', 'feature_uncategorized');
      if (!dbUncatFeat || dbUncatFeat.length === 0) {
        await supabase.from('features').insert({
          id: 'feature_uncategorized',
          project_id: 'project_uncategorized',
          name: 'Uncategorized Feature',
          collapsed: false,
          start_date: todayStr,
          due_date: todayStr,
          duration: 1,
        });
      }

    } catch (e) {
      console.error('Failed to initialize Supabase connection', e);
      set({ supabaseConnected: false, isLoading: false });
      if (get().projectIds.length === 0) {
        get().loadSampleData();
      }
    }
  },

  addProject: async (name) => {
    pushHistory(get());
    const id = `project_${Date.now()}`;
    const todayStr = formatDateStr(new Date());
    const newProject: Project = {
      id,
      name,
      collapsed: false,
      startDate: todayStr,
      dueDate: todayStr,
      duration: 1,
      featureIds: [],
    };

    const newProjects = { ...get().projects, [id]: newProject };
    const newProjectIds = [...get().projectIds, id];

    set({ projects: newProjects, projectIds: newProjectIds, selectedId: id, editingId: id });
    saveToLocalStorage({ ...get(), projects: newProjects, projectIds: newProjectIds });

    // Sync to Supabase
    if (get().supabaseConnected) {
      const { error } = await supabase.from('projects').insert({
        id,
        name,
        collapsed: false,
        start_date: todayStr,
        due_date: todayStr,
        duration: 1,
      });
      if (error) console.error('Failed to sync new project to Supabase:', error.message);
    }
  },

  addFeature: async (projectId, name) => {
    const project = get().projects[projectId];
    if (!project) return;
    pushHistory(get());

    const id = `feature_${Date.now()}`;
    const todayStr = formatDateStr(new Date());
    const newFeature: Feature = {
      id,
      parentId: projectId,
      name,
      collapsed: false,
      startDate: todayStr,
      dueDate: todayStr,
      duration: 1,
      tasks: [],
      taskIds: [],
    };

    const newFeatures = { ...get().features, [id]: newFeature };
    const newProjects = {
      ...get().projects,
      [projectId]: {
        ...project,
        featureIds: [...project.featureIds, id],
      },
    };

    const recalculated = recalculateDates(newProjects, newFeatures, get().tasks);

    set({
      projects: recalculated.projects,
      features: recalculated.features,
      selectedId: id,
      editingId: id,
    });
    saveToLocalStorage({
      ...get(),
      projects: recalculated.projects,
      features: recalculated.features,
    });

    // Sync to Supabase
    if (get().supabaseConnected) {
      const { error } = await supabase.from('features').insert({
        id,
        project_id: projectId,
        name,
        collapsed: false,
        start_date: todayStr,
        due_date: todayStr,
        duration: 1,
      });
      if (error) console.error('Failed to sync new feature to Supabase:', error.message);
    }
  },

  addTask: async (featureId, name, start, due) => {
    const feature = get().features[featureId];
    if (!feature) return;
    pushHistory(get());

    const id = `task_${Date.now()}`;
    const todayStr = formatDateStr(new Date());
    const startDate = start || feature.startDate || todayStr;
    const dueDate = due || feature.dueDate || todayStr;

    const newTask: Task = {
      id,
      parentId: featureId,
      name,
      startDate,
      dueDate,
      duration: getDaysCount(startDate, dueDate),
      status: 'todo',
    };

    const newTasks = { ...get().tasks, [id]: newTask };
    const newFeatures = {
      ...get().features,
      [featureId]: {
        ...feature,
        taskIds: [...feature.taskIds, id],
      },
    };

    const recalculated = recalculateDates(get().projects, newFeatures, newTasks);

    set({
      projects: recalculated.projects,
      features: recalculated.features,
      tasks: newTasks,
      selectedId: id,
      editingId: id,
    });
    saveToLocalStorage({
      ...get(),
      projects: recalculated.projects,
      features: recalculated.features,
      tasks: newTasks,
    });

    // Sync to Supabase
    if (get().supabaseConnected) {
      const { error } = await supabase.from('tasks').insert({
        id,
        feature_id: featureId,
        name,
        start_date: startDate,
        due_date: dueDate,
        duration: newTask.duration,
        status: 'todo',
      });
      if (error) console.error('Failed to sync new task to Supabase:', error.message);
      
      // Update recalculated parents in DB
      const parentFeat = recalculated.features[featureId];
      if (parentFeat) {
        await supabase
          .from('features')
          .update({
            start_date: parentFeat.startDate,
            due_date: parentFeat.dueDate,
            duration: parentFeat.duration,
          })
          .eq('id', featureId);
      }
      const parentProj = recalculated.projects[feature.parentId];
      if (parentProj) {
        await supabase
          .from('projects')
          .update({
            start_date: parentProj.startDate,
            due_date: parentProj.dueDate,
            duration: parentProj.duration,
          })
          .eq('id', feature.parentId);
      }
    }
  },

  deleteItem: async (id, type) => {
    if (id === 'project_uncategorized' || id === 'feature_uncategorized') {
      return;
    }
    pushHistory(get());
    const state = get();
    const newProjects = { ...state.projects };
    const newFeatures = { ...state.features };
    const newTasks = { ...state.tasks };
    let newProjectIds = [...state.projectIds];

    if (type === 'project') {
      const proj = newProjects[id];
      if (proj) {
        proj.featureIds.forEach((fId) => {
          const feat = newFeatures[fId];
          if (feat) {
            feat.taskIds.forEach((tId) => {
              delete newTasks[tId];
            });
            delete newFeatures[fId];
          }
        });
        delete newProjects[id];
        newProjectIds = newProjectIds.filter((pId) => pId !== id);
      }
    } else if (type === 'feature') {
      const feat = newFeatures[id];
      if (feat) {
        feat.taskIds.forEach((tId) => {
          delete newTasks[tId];
        });
        const parentProj = newProjects[feat.parentId];
        if (parentProj) {
          newProjects[feat.parentId] = {
            ...parentProj,
            featureIds: parentProj.featureIds.filter((fId) => fId !== id),
          };
        }
        delete newFeatures[id];
      }
    } else {
      const task = newTasks[id];
      if (task) {
        const parentFeat = newFeatures[task.parentId];
        if (parentFeat) {
          newFeatures[task.parentId] = {
            ...parentFeat,
            taskIds: parentFeat.taskIds.filter((tId) => tId !== id),
          };
        }
        delete newTasks[id];
      }
    }

    const recalculated = recalculateDates(newProjects, newFeatures, newTasks);

    set({
      projects: recalculated.projects,
      features: recalculated.features,
      tasks: newTasks,
      projectIds: newProjectIds,
      selectedId: state.selectedId === id ? null : state.selectedId,
      editingId: state.editingId === id ? null : state.editingId,
    });

    saveToLocalStorage({
      projects: recalculated.projects,
      features: recalculated.features,
      tasks: newTasks,
      projectIds: newProjectIds,
      zoom: state.zoom,
      theme: state.theme,
      viewStartDate: state.viewStartDate,
      viewEndDate: state.viewEndDate,
    });

    // Sync to Supabase
    if (get().supabaseConnected) {
      if (type === 'project') {
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) console.error('Failed to delete project from Supabase:', error.message);
      } else if (type === 'feature') {
        const { error } = await supabase.from('features').delete().eq('id', id);
        if (error) console.error('Failed to delete feature from Supabase:', error.message);
      } else {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) console.error('Failed to delete task from Supabase:', error.message);

        // Update recalculated parent dates in DB
        const taskObj = state.tasks[id];
        if (taskObj) {
          const parentFeat = recalculated.features[taskObj.parentId];
          if (parentFeat) {
            await supabase
              .from('features')
              .update({
                start_date: parentFeat.startDate,
                due_date: parentFeat.dueDate,
                duration: parentFeat.duration,
              })
              .eq('id', taskObj.parentId);

            const featObj = state.features[taskObj.parentId];
            if (featObj) {
              const parentProj = recalculated.projects[featObj.parentId];
              if (parentProj) {
                await supabase
                  .from('projects')
                  .update({
                    start_date: parentProj.startDate,
                    due_date: parentProj.dueDate,
                    duration: parentProj.duration,
                  })
                  .eq('id', featObj.parentId);
              }
            }
          }
        }
      }
    }
  },

  renameItem: async (id, type, newName) => {
    if (id === 'project_uncategorized' || id === 'feature_uncategorized') {
      return;
    }
    if (!newName.trim()) return;
    pushHistory(get());

    if (type === 'project') {
      const newProjects = {
        ...get().projects,
        [id]: { ...get().projects[id], name: newName },
      };
      set({ projects: newProjects });
      saveToLocalStorage({ ...get(), projects: newProjects });

      if (get().supabaseConnected) {
        await supabase.from('projects').update({ name: newName }).eq('id', id);
      }
    } else if (type === 'feature') {
      const newFeatures = {
        ...get().features,
        [id]: { ...get().features[id], name: newName },
      };
      set({ features: newFeatures });
      saveToLocalStorage({ ...get(), features: newFeatures });

      if (get().supabaseConnected) {
        await supabase.from('features').update({ name: newName }).eq('id', id);
      }
    } else {
      const newTasks = {
        ...get().tasks,
        [id]: { ...get().tasks[id], name: newName },
      };
      set({ tasks: newTasks });
      saveToLocalStorage({ ...get(), tasks: newTasks });

      if (get().supabaseConnected) {
        await supabase.from('tasks').update({ name: newName }).eq('id', id);
      }
    }
  },

  toggleCollapse: async (id, type) => {
    if (type === 'project') {
      const newCol = !get().projects[id].collapsed;
      const newProjects = {
        ...get().projects,
        [id]: { ...get().projects[id], collapsed: newCol },
      };
      set({ projects: newProjects });
      saveToLocalStorage({ ...get(), projects: newProjects });

      if (get().supabaseConnected) {
        await supabase.from('projects').update({ collapsed: newCol }).eq('id', id);
      }
    } else {
      const newCol = !get().features[id].collapsed;
      const newFeatures = {
        ...get().features,
        [id]: { ...get().features[id], collapsed: newCol },
      };
      set({ features: newFeatures });
      saveToLocalStorage({ ...get(), features: newFeatures });

      if (get().supabaseConnected) {
        await supabase.from('features').update({ collapsed: newCol }).eq('id', id);
      }
    }
  },

  updateTaskDates: async (taskId, startStr, dueStr) => {
    const task = get().tasks[taskId];
    if (!task) return;

    if (task.startDate === startStr && task.dueDate === dueStr) return;

    // Local changes first for 60fps interaction smoothness
    const duration = getDaysCount(startStr, dueStr);
    const newTasks = {
      ...get().tasks,
      [taskId]: {
        ...task,
        startDate: startStr,
        dueDate: dueStr,
        duration,
      },
    };

    const recalculated = recalculateDates(get().projects, get().features, newTasks);

    set({
      projects: recalculated.projects,
      features: recalculated.features,
      tasks: newTasks,
    });

    saveToLocalStorage({
      ...get(),
      projects: recalculated.projects,
      features: recalculated.features,
      tasks: newTasks,
    });

    // Update in DB (optimistic execution in background)
    if (get().supabaseConnected) {
      await supabase
        .from('tasks')
        .update({
          start_date: startStr,
          due_date: dueStr,
          duration,
        })
        .eq('id', taskId);

      // Sync parents
      const parentFeat = recalculated.features[task.parentId];
      if (parentFeat) {
        await supabase
          .from('features')
          .update({
            start_date: parentFeat.startDate,
            due_date: parentFeat.dueDate,
            duration: parentFeat.duration,
          })
          .eq('id', task.parentId);

        const featObj = get().features[task.parentId];
        if (featObj) {
          const parentProj = recalculated.projects[featObj.parentId];
          if (parentProj) {
            await supabase
              .from('projects')
              .update({
                start_date: parentProj.startDate,
                due_date: parentProj.dueDate,
                duration: parentProj.duration,
              })
              .eq('id', featObj.parentId);
          }
        }
      }
    }
  },

  moveFeature: async (featureId, deltaDays) => {
    if (deltaDays === 0) return;
    pushHistory(get());

    const state = get();
    const feature = state.features[featureId];
    if (!feature) return;

    const newTasks = { ...state.tasks };
    
    // Shift all child tasks by deltaDays
    feature.taskIds.forEach((tId) => {
      const task = newTasks[tId];
      if (!task) return;

      const start = parseDate(task.startDate);
      const due = parseDate(task.dueDate);
      
      const newStart = formatDateStr(addDays(start, deltaDays));
      const newDue = formatDateStr(addDays(due, deltaDays));

      newTasks[tId] = {
        ...task,
        startDate: newStart,
        dueDate: newDue,
      };
    });

    const recalculated = recalculateDates(state.projects, state.features, newTasks);

    set({
      projects: recalculated.projects,
      features: recalculated.features,
      tasks: newTasks,
    });

    saveToLocalStorage({
      ...get(),
      projects: recalculated.projects,
      features: recalculated.features,
      tasks: newTasks,
    });

    // Sync to Supabase
    if (get().supabaseConnected) {
      // Update each child task in DB
      for (const tId of feature.taskIds) {
        const t = newTasks[tId];
        if (t) {
          await supabase
            .from('tasks')
            .update({
              start_date: t.startDate,
              due_date: t.dueDate,
            })
            .eq('id', t.id);
        }
      }

      // Update feature and project dates in DB
      const parentFeat = recalculated.features[featureId];
      if (parentFeat) {
        await supabase
          .from('features')
          .update({
            start_date: parentFeat.startDate,
            due_date: parentFeat.dueDate,
            duration: parentFeat.duration,
          })
          .eq('id', featureId);
      }
      
      const parentProj = recalculated.projects[feature.parentId];
      if (parentProj) {
        await supabase
          .from('projects')
          .update({
            start_date: parentProj.startDate,
            due_date: parentProj.dueDate,
            duration: parentProj.duration,
          })
          .eq('id', feature.parentId);
      }
    }
  },

  setFeatureColor: async (featureId, color) => {
    pushHistory(get());
    const newFeatures = {
      ...get().features,
      [featureId]: {
        ...get().features[featureId],
        color,
      },
    };
    set({ features: newFeatures });
    saveToLocalStorage({ ...get(), features: newFeatures });

    if (get().supabaseConnected) {
      await supabase
        .from('features')
        .update({ color })
        .eq('id', featureId);
    }
  },

  setViewMode: (viewMode) => {
    set({ viewMode });
    saveToLocalStorage({ ...get(), viewMode });
  },

  setTaskStatus: async (taskId, status) => {
    pushHistory(get());
    const newTasks = {
      ...get().tasks,
      [taskId]: {
        ...get().tasks[taskId],
        status,
      },
    };
    set({ tasks: newTasks });
    saveToLocalStorage({ ...get(), tasks: newTasks });

    if (get().supabaseConnected) {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);
      if (error) console.error('Failed to update task status in Supabase:', error.message);
    }
  },

  setZoom: (zoom) => {
    set({ zoom });
    saveToLocalStorage({ ...get(), zoom });
  },

  setTheme: (theme) => {
    set({ theme });
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    saveToLocalStorage({ ...get(), theme });
  },

  setSelectedId: (selectedId) => set({ selectedId }),
  setEditingId: (editingId) => set({ editingId }),

  undo: () => {
    const prev = historyStack.pop();
    if (!prev) return;

    redoStack.push({
      projects: JSON.parse(JSON.stringify(get().projects)),
      features: JSON.parse(JSON.stringify(get().features)),
      tasks: JSON.parse(JSON.stringify(get().tasks)),
      projectIds: [...get().projectIds],
    });

    set({
      projects: prev.projects,
      features: prev.features,
      tasks: prev.tasks,
      projectIds: prev.projectIds,
    });

    saveToLocalStorage({
      ...get(),
      projects: prev.projects,
      features: prev.features,
      tasks: prev.tasks,
      projectIds: prev.projectIds,
    });

    // Note: Database is not updated on undo/redo in this lightweight planner to prevent DB spam.
    // Instead, the client state stays in memory and local storage, and can be saved on key actions.
  },

  redo: () => {
    const next = redoStack.pop();
    if (!next) return;

    historyStack.push({
      projects: JSON.parse(JSON.stringify(get().projects)),
      features: JSON.parse(JSON.stringify(get().features)),
      tasks: JSON.parse(JSON.stringify(get().tasks)),
      projectIds: [...get().projectIds],
    });

    set({
      projects: next.projects,
      features: next.features,
      tasks: next.tasks,
      projectIds: next.projectIds,
    });

    saveToLocalStorage({
      ...get(),
      projects: next.projects,
      features: next.features,
      tasks: next.tasks,
      projectIds: next.projectIds,
    });
  },

  clearAll: async () => {
    pushHistory(get());
    set({
      projects: {},
      features: {},
      tasks: {},
      projectIds: [],
      selectedId: null,
      editingId: null,
    });
    saveToLocalStorage({
      ...get(),
      projects: {},
      features: {},
      tasks: {},
      projectIds: [],
    });

    if (get().supabaseConnected) {
      // Clear tables in DB
      await supabase.from('projects').delete().neq('id', 'clear_dummy_hack_value');
    }
  },

  loadSampleData: async () => {
    pushHistory(get());
    const today = new Date();
    const dStr = (offset: number) => formatDateStr(addDays(today, offset));

    const projects: Record<string, Project> = {};
    const features: Record<string, Feature> = {};
    const tasks: Record<string, Task> = {};
    const projectIds: string[] = [];

    // Project Alpha
    const pAlphaId = 'p_alpha';
    projectIds.push(pAlphaId);
    projects[pAlphaId] = {
      id: pAlphaId,
      name: 'Project Alpha',
      collapsed: false,
      startDate: dStr(-10),
      dueDate: dStr(25),
      duration: 36,
      featureIds: ['f_auth', 'f_payments', 'f_notifs'],
    };

    // Feature 1: Authentication
    features['f_auth'] = {
      id: 'f_auth',
      parentId: pAlphaId,
      name: 'Authentication',
      collapsed: false,
      startDate: dStr(-10),
      dueDate: dStr(5),
      duration: 16,
      taskIds: ['t_login', 't_register', 't_forgot'],
      tasks: [],
    };
    tasks['t_login'] = {
      id: 't_login',
      parentId: 'f_auth',
      name: 'Login Screen UI & Form Val',
      startDate: dStr(-10),
      dueDate: dStr(-3),
      duration: 8,
      status: 'done',
    };
    tasks['t_register'] = {
      id: 't_register',
      parentId: 'f_auth',
      name: 'Register Screen flow',
      startDate: dStr(-2),
      dueDate: dStr(2),
      duration: 5,
      status: 'in_progress',
    };
    tasks['t_forgot'] = {
      id: 't_forgot',
      parentId: 'f_auth',
      name: 'Forgot Password Reset link',
      startDate: dStr(1),
      dueDate: dStr(5),
      duration: 5,
      status: 'todo',
    };

    // Feature 2: Payments
    features['f_payments'] = {
      id: 'f_payments',
      parentId: pAlphaId,
      name: 'Payments Integration',
      collapsed: false,
      startDate: dStr(4),
      dueDate: dStr(20),
      duration: 17,
      taskIds: ['t_qr', 't_settle', 't_refund'],
      tasks: [],
    };
    tasks['t_qr'] = {
      id: 't_qr',
      parentId: 'f_payments',
      name: 'QR Payment Scanning',
      startDate: dStr(4),
      dueDate: dStr(10),
      duration: 7,
      status: 'in_progress',
    };
    tasks['t_settle'] = {
      id: 't_settle',
      parentId: 'f_payments',
      name: 'Settlement Dashboard',
      startDate: dStr(9),
      dueDate: dStr(15),
      duration: 7,
      status: 'todo',
    };
    tasks['t_refund'] = {
      id: 't_refund',
      parentId: 'f_payments',
      name: 'Refund API integration',
      startDate: dStr(14),
      dueDate: dStr(20),
      duration: 7,
      status: 'todo',
    };

    // Feature 3: Notifications
    features['f_notifs'] = {
      id: 'f_notifs',
      parentId: pAlphaId,
      name: 'Notifications Engine',
      collapsed: true,
      startDate: dStr(15),
      dueDate: dStr(25),
      duration: 11,
      taskIds: ['t_notif_push', 't_notif_email'],
      tasks: [],
    };
    tasks['t_notif_push'] = {
      id: 't_notif_push',
      parentId: 'f_notifs',
      name: 'Push notifications dispatch',
      startDate: dStr(15),
      dueDate: dStr(22),
      duration: 8,
      status: 'done',
    };
    tasks['t_notif_email'] = {
      id: 't_notif_email',
      parentId: 'f_notifs',
      name: 'Email notification dispatch',
      startDate: dStr(18),
      dueDate: dStr(25),
      duration: 8,
      status: 'done',
    };

    // Project Beta
    const pBetaId = 'p_beta';
    projectIds.push(pBetaId);
    projects[pBetaId] = {
      id: pBetaId,
      name: 'Project Beta (Mobile App)',
      collapsed: false,
      startDate: dStr(10),
      dueDate: dStr(45),
      duration: 36,
      featureIds: ['f_profile', 'f_wallet', 'f_offers'],
    };

    // Feature 4: Profile
    features['f_profile'] = {
      id: 'f_profile',
      parentId: pBetaId,
      name: 'Profile Settings',
      collapsed: false,
      startDate: dStr(10),
      dueDate: dStr(20),
      duration: 11,
      taskIds: ['t_user_prof'],
      tasks: [],
    };
    tasks['t_user_prof'] = {
      id: 't_user_prof',
      parentId: 'f_profile',
      name: 'User profile edit UI',
      startDate: dStr(10),
      dueDate: dStr(20),
      duration: 11,
      status: 'in_progress',
    };

    // Feature 5: Wallet
    features['f_wallet'] = {
      id: 'f_wallet',
      parentId: pBetaId,
      name: 'Wallet Interface',
      collapsed: false,
      startDate: dStr(18),
      dueDate: dStr(35),
      duration: 18,
      taskIds: ['t_wallet_bal', 't_wallet_history'],
      tasks: [],
    };
    tasks['t_wallet_bal'] = {
      id: 't_wallet_bal',
      parentId: 'f_wallet',
      name: 'Wallet balance check UI',
      startDate: dStr(18),
      dueDate: dStr(28),
      duration: 11,
      status: 'todo',
    };
    tasks['t_wallet_history'] = {
      id: 't_wallet_history',
      parentId: 'f_wallet',
      name: 'Transaction history logger',
      startDate: dStr(24),
      dueDate: dStr(35),
      duration: 12,
      status: 'todo',
    };

    // Feature 6: Offers
    features['f_offers'] = {
      id: 'f_offers',
      parentId: pBetaId,
      name: 'Offers System',
      collapsed: false,
      startDate: dStr(30),
      dueDate: dStr(45),
      duration: 16,
      taskIds: ['t_offer_redeem'],
      tasks: [],
    };
    tasks['t_offer_redeem'] = {
      id: 't_offer_redeem',
      parentId: 'f_offers',
      name: 'Promo code redemption',
      startDate: dStr(30),
      dueDate: dStr(45),
      duration: 16,
      status: 'todo',
    };

    const recalculated = recalculateDates(projects, features, tasks);

    const viewStart = dStr(-30);
    const viewEndDate = dStr(90);

    set({
      projects: recalculated.projects,
      features: recalculated.features,
      tasks,
      projectIds,
      selectedId: null,
      editingId: null,
      viewStartDate: viewStart,
      viewEndDate: viewEndDate,
    });

    saveToLocalStorage({
      projects: recalculated.projects,
      features: recalculated.features,
      tasks,
      projectIds,
      zoom: get().zoom,
      theme: get().theme,
      viewStartDate: viewStart,
      viewEndDate: viewEndDate,
    });

    // Populate Supabase if connected
    if (get().supabaseConnected) {
      try {
        // Clear first
        await supabase.from('projects').delete().neq('id', 'clear_dummy_hack_value');

        // Insert Projects
        for (const p of Object.values(recalculated.projects)) {
          await supabase.from('projects').insert({
            id: p.id,
            name: p.name,
            collapsed: p.collapsed,
            start_date: p.startDate,
            due_date: p.dueDate,
            duration: p.duration,
          });
        }

        // Insert Features
        for (const f of Object.values(recalculated.features)) {
          await supabase.from('features').insert({
            id: f.id,
            project_id: f.parentId,
            name: f.name,
            collapsed: f.collapsed,
            start_date: f.startDate,
            due_date: f.dueDate,
            duration: f.duration,
          });
        }

        // Insert Tasks
        for (const t of Object.values(tasks)) {
          await supabase.from('tasks').insert({
            id: t.id,
            feature_id: t.parentId,
            name: t.name,
            start_date: t.startDate,
            due_date: t.dueDate,
            duration: t.duration,
            status: t.status || 'todo',
          });
        }
        console.log('Sample data populated in Supabase!');
      } catch (err) {
        console.error('Failed to populate sample data to Supabase:', err);
      }
    }
  },

  loadHugeData: async () => {
    pushHistory(get());
    const today = new Date();
    const dStr = (offset: number) => formatDateStr(addDays(today, offset));

    const projects: Record<string, Project> = {};
    const features: Record<string, Feature> = {};
    const tasks: Record<string, Task> = {};
    const projectIds: string[] = [];

    for (let p = 1; p <= 100; p++) {
      const pId = `proj_huge_${p}`;
      projectIds.push(pId);
      
      const featureIds: string[] = [];
      for (let f = 1; f <= 5; f++) {
        const fId = `feat_huge_${p}_${f}`;
        featureIds.push(fId);

        const taskIds: string[] = [];
        for (let t = 1; t <= 10; t++) {
          const tId = `task_huge_${p}_${f}_${t}`;
          taskIds.push(tId);

          const startOffset = (p - 1) * 3 + f * 2 + t;
          const duration = 3 + (t % 5);
          tasks[tId] = {
            id: tId,
            parentId: fId,
            name: `Task P${p}-F${f}-T${t}`,
            startDate: dStr(startOffset),
            dueDate: dStr(startOffset + duration - 1),
            duration,
            status: 'todo',
          };
        }

        features[fId] = {
          id: fId,
          parentId: pId,
          name: `Feature P${p}-F${f}`,
          collapsed: true,
          startDate: '',
          dueDate: '',
          duration: 0,
          taskIds,
          tasks: [],
        };
      }

      projects[pId] = {
        id: pId,
        name: `Project Performance Test ${p}`,
        collapsed: true,
        startDate: '',
        dueDate: '',
        duration: 0,
        featureIds,
      };
    }

    const recalculated = recalculateDates(projects, features, tasks);

    const viewStart = dStr(-30);
    const viewEndDate = dStr(450);

    set({
      projects: recalculated.projects,
      features: recalculated.features,
      tasks,
      projectIds,
      selectedId: null,
      editingId: null,
      viewStartDate: viewStart,
      viewEndDate: viewEndDate,
    });

    saveToLocalStorage({
      projects: recalculated.projects,
      features: recalculated.features,
      tasks,
      projectIds,
      zoom: get().zoom,
      theme: get().theme,
      viewStartDate: viewStart,
      viewEndDate: viewEndDate,
    });

    // NOTE: We do not auto-populate 5,000 tasks into Supabase to prevent network rate limiting/throttling.
    // It runs client-side inside the virtualizer, which is what performance tests should focus on.
  },

  moveTaskToFeature: async (taskId, targetFeatureId) => {
    const task = get().tasks[taskId];
    if (!task) return;
    if (task.parentId === targetFeatureId) return;

    pushHistory(get());

    const oldParentId = task.parentId;
    const newTasks = {
      ...get().tasks,
      [taskId]: {
        ...task,
        parentId: targetFeatureId,
      },
    };

    const newFeatures = { ...get().features };
    // Remove from old feature
    const oldFeat = newFeatures[oldParentId];
    if (oldFeat) {
      newFeatures[oldParentId] = {
        ...oldFeat,
        taskIds: oldFeat.taskIds.filter((id) => id !== taskId),
      };
    }

    // Add to target feature
    const targetFeat = newFeatures[targetFeatureId];
    if (targetFeat) {
      newFeatures[targetFeatureId] = {
        ...targetFeat,
        taskIds: [...targetFeat.taskIds.filter((id) => id !== taskId), taskId],
      };
    }

    const recalculated = recalculateDates(get().projects, newFeatures, newTasks);

    set({
      projects: recalculated.projects,
      features: recalculated.features,
      tasks: newTasks,
    });

    saveToLocalStorage({
      ...get(),
      projects: recalculated.projects,
      features: recalculated.features,
      tasks: newTasks,
    });

    if (get().supabaseConnected) {
      const { error } = await supabase
        .from('tasks')
        .update({ feature_id: targetFeatureId })
        .eq('id', taskId);

      if (error) {
        console.error('Failed to sync moved task in Supabase:', error.message);
      }

      // Sync parent feature dates
      if (targetFeat) {
        const nextFeat = recalculated.features[targetFeatureId];
        await supabase
          .from('features')
          .update({
            start_date: nextFeat.startDate,
            due_date: nextFeat.dueDate,
            duration: nextFeat.duration,
          })
          .eq('id', targetFeatureId);
        
        const parentProj = recalculated.projects[targetFeat.parentId];
        if (parentProj) {
          await supabase
            .from('projects')
            .update({
              start_date: parentProj.startDate,
              due_date: parentProj.dueDate,
              duration: parentProj.duration,
            })
            .eq('id', targetFeat.parentId);
        }
      }

      // Sync old parent feature dates
      if (oldParentId && newFeatures[oldParentId]) {
        const prevFeat = recalculated.features[oldParentId];
        await supabase
          .from('features')
          .update({
            start_date: prevFeat.startDate,
            due_date: prevFeat.dueDate,
            duration: prevFeat.duration,
          })
          .eq('id', oldParentId);

        const parentProj = recalculated.projects[newFeatures[oldParentId].parentId];
        if (parentProj) {
          await supabase
            .from('projects')
            .update({
              start_date: parentProj.startDate,
              due_date: parentProj.dueDate,
              duration: parentProj.duration,
            })
            .eq('id', newFeatures[oldParentId].parentId);
        }
      }
    }
  },

  moveTaskToUncategorized: async (taskId) => {
    await get().moveTaskToFeature(taskId, 'feature_uncategorized');
  },

  getFlatRows: () => {
    const { projects, features, tasks, projectIds } = get();
    const rows: FlatRow[] = [];

    projectIds.forEach((pId) => {
      const p = projects[pId];
      if (!p) return;

      rows.push({
        id: p.id,
        type: 'project',
        name: p.name,
        level: 0,
        collapsed: p.collapsed,
        startDate: p.startDate,
        dueDate: p.dueDate,
        duration: p.duration,
      });

      if (p.collapsed) return;

      if (p.id === 'project_uncategorized') {
        const uncFeat = features['feature_uncategorized'];
        if (uncFeat) {
          uncFeat.taskIds.forEach((tId) => {
            const t = tasks[tId];
            if (!t) return;
            rows.push({
              id: t.id,
              type: 'task',
              name: t.name,
              level: 1,
              parentId: p.id,
              startDate: t.startDate,
              dueDate: t.dueDate,
              duration: t.duration,
              status: t.status,
            });
          });
        }
        return;
      }

      p.featureIds.forEach((fId) => {
        if (fId === 'feature_uncategorized') return;
        const f = features[fId];
        if (!f) return;

        rows.push({
          id: f.id,
          type: 'feature',
          name: f.name,
          level: 1,
          collapsed: f.collapsed,
          parentId: p.id,
          startDate: f.startDate,
          dueDate: f.dueDate,
          duration: f.duration,
          color: f.color,
        });

        if (f.collapsed) return;

        f.taskIds.forEach((tId) => {
          const t = tasks[tId];
          if (!t) return;

          rows.push({
            id: t.id,
            type: 'task',
            name: t.name,
            level: 2,
            parentId: f.id,
            startDate: t.startDate,
            dueDate: t.dueDate,
            duration: t.duration,
            status: t.status,
          });
        });
      });
    });

    return rows;
  },
}));

// Initialize theme on load
const currentTheme = useGanttStore.getState().theme;
if (currentTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

// Trigger async Supabase connection on load
useGanttStore.getState().initSupabase();
