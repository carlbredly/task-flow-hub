export function downloadCSV(data: Record<string, string | number | null | undefined>[], filename: string) {
  const headers = Object.keys(data[0] ?? {});
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    headers.map(esc).join(","),
    ...data.map((row) => headers.map((h) => esc(String(row[h] ?? ""))).join(",")),
  ];
  const bom = "\uFEFF";
  const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
