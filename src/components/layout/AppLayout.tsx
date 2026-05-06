import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { TaskPanel } from "@/components/tasks/TaskPanel";
import { useAppStore } from "@/stores/useAppStore";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import { MobileBottomNav } from "./MobileBottomNav";

export const AppLayout = () => {
  const location = useLocation();
  const { openTaskPanel } = useAppStore();
  useHeartbeat();

  useEffect(() => {
    const handler = (e: CustomEvent<{ taskId: string }>) => openTaskPanel(e.detail.taskId);
    window.addEventListener("trackm:open-task" as any, handler as any);
    return () => window.removeEventListener("trackm:open-task" as any, handler as any);
  }, [openTaskPanel]);

  return (
    <div className="flex h-screen w-full bg-background p-0 md:p-3 md:pl-0">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-none border-0 bg-background shadow-none md:rounded-3xl md:border md:border-border md:bg-card md:shadow-sm">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background pb-16 scrollbar-thin md:bg-transparent md:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <MobileBottomNav />
      <TaskPanel />
    </div>
  );
};
