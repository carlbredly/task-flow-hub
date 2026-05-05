import { create } from "zustand";

interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  invite_token: string;
}

interface AppState {
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (w: Workspace | null) => void;
  taskPanelOpenId: string | null;
  openTaskPanel: (id: string | null) => void;
  groupBy: "category" | "status";
  setGroupBy: (g: "category" | "status") => void;
  view: "list" | "kanban" | "calendar" | "gantt";
  setView: (v: "list" | "kanban" | "calendar" | "gantt") => void;
  tasksSearch: string;
  setTasksSearch: (q: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentWorkspace: null,
  setCurrentWorkspace: (w) => {
    set({ currentWorkspace: w });
    if (w) localStorage.setItem("trackm:workspace", w.id);
  },
  taskPanelOpenId: null,
  openTaskPanel: (id) => set({ taskPanelOpenId: id }),
  groupBy: "category",
  setGroupBy: (g) => set({ groupBy: g }),
  view: "kanban",
  setView: (v) => set({ view: v }),
  tasksSearch: "",
  setTasksSearch: (q) => set({ tasksSearch: q }),
}));
