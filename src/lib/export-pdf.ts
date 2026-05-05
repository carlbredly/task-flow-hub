export function printTaskReport(
  tasks: {
    title: string;
    status: string;
    priority: string;
    category: string;
    assignee: string;
    due_date: string;
    time_spent: number;
    created_at: string;
  }[],
  workspaceName: string,
) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const statusClass = (s: string) => {
    const map: Record<string, string> = {
      todo: "bg-blue-100 text-blue-800",
      in_progress: "bg-amber-100 text-amber-800",
      delayed: "bg-red-100 text-red-800",
      done: "bg-green-100 text-green-800",
    };
    return map[s] ?? "bg-gray-100 text-gray-800";
  };
  const statusLabel: Record<string, string> = {
    todo: "À faire",
    in_progress: "En cours",
    delayed: "En retard",
    done: "Terminé",
  };
  const fmt = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h === 0) return `${m}min`;
    return `${h}h${m > 0 ? m + "min" : ""}`;
  };

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Rapport - ${esc(workspaceName)}</title>
  <style>
    @page { margin: 20mm 15mm; size: A4; }
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, system-ui, sans-serif;
      font-size: 11px;
      color: #1a1a2e;
      line-height: 1.5;
      margin: 0;
      padding: 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16px;
      border-bottom: 2px solid #e5e7eb;
      margin-bottom: 20px;
    }
    .header h1 { font-size: 20px; margin: 0; font-weight: 700; }
    .header p { font-size: 11px; color: #6b7280; margin: 2px 0 0; }
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px 12px;
      text-align: center;
    }
    .stat-card strong { display: block; font-size: 20px; font-weight: 700; }
    .stat-card span { font-size: 10px; color: #6b7280; }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      text-align: left;
      padding: 8px 10px;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6b7280;
      border-bottom: 1px solid #e5e7eb;
    }
    td {
      padding: 7px 10px;
      border-bottom: 1px solid #f3f4f6;
      font-size: 10px;
    }
    .badge {
      display: inline-block;
      padding: 1px 7px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 600;
    }
    .footer {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 9px;
      color: #9ca3af;
      text-align: center;
    }
    tr:last-child td { border-bottom: none; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${esc(workspaceName)}</h1>
      <p>Rapport d'avancement · ${new Date().toLocaleDateString("fr", { dateStyle: "long" })}</p>
    </div>
    <div style="text-align:right;font-size:10px;color:#6b7280;">
      ${tasks.length} tâche${tasks.length > 1 ? "s" : ""}
    </div>
  </div>

  <div class="stats">
    <div class="stat-card">
      <strong>${tasks.filter((t) => t.status === "done").length}</strong>
      <span>Terminées</span>
    </div>
    <div class="stat-card">
      <strong>${tasks.filter((t) => t.status === "in_progress").length}</strong>
      <span>En cours</span>
    </div>
    <div class="stat-card">
      <strong>${tasks.filter((t) => t.status === "delayed").length}</strong>
      <span>En retard</span>
    </div>
    <div class="stat-card">
      <strong>${Math.floor(tasks.reduce((s, t) => s + (t.time_spent || 0), 0) / 60)}</strong>
      <span>Minutes focus</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Tâche</th>
        <th>Statut</th>
        <th>Priorité</th>
        <th>Catégorie</th>
        <th>Assigné</th>
        <th>Échéance</th>
        <th>Temps</th>
      </tr>
    </thead>
    <tbody>
      ${tasks.map((t) => `
        <tr>
          <td style="font-weight:500;">${esc(t.title)}</td>
          <td><span class="badge ${statusClass(t.status)}">${statusLabel[t.status] ?? t.status}</span></td>
          <td>${esc(t.priority)}</td>
          <td>${esc(t.category)}</td>
          <td>${esc(t.assignee)}</td>
          <td>${esc(t.due_date)}</td>
          <td>${t.time_spent ? fmt(t.time_spent) : "-"}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="footer">
    Généré par Track'm le ${new Date().toLocaleString("fr")}
  </div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Veuillez autoriser les popups pour exporter le PDF."); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}
