const Stub = ({ title, body }: { title: string; body: string }) => (
  <div className="mx-auto max-w-2xl p-12 text-center animate-fade-in">
    <h2 className="text-xl font-semibold">{title}</h2>
    <p className="mt-2 text-sm text-muted-foreground">{body}</p>
  </div>
);

export const Calendar = () => <Stub title="Calendar" body="Calendar view, iCal export and Google Calendar sync land in Phase 4." />;
export const Notifications = () => <Stub title="Notifications" body="Realtime notifications and reminders land in Phase 5." />;
export const Settings = () => <Stub title="Settings" body="Profile, workspace, members, categories, and integrations land in Phase 5." />;
