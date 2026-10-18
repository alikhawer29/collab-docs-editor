export const MAX_IMPORT_BYTES = 200 * 1024;

export function basename(filename: string) {
  return filename.split(/[/\\]/).pop() || filename;
}

export function isImportName(filename: string) {
  return /\.(txt|md)$/i.test(basename(filename));
}

export function titleFromFilename(filename: string) {
  const base = basename(filename)
    .replace(/\.(txt|md)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!base) return "Imported document";
  return base.slice(0, 120);
}

export function importProblem(filename: string, size: number) {
  if (!isImportName(filename)) {
    return "Import a .txt or .md file. Other types, including .docx, are not supported.";
  }
  if (size <= 0) return "That file is empty.";
  if (size > MAX_IMPORT_BYTES) return "Files need to be 200 KB or smaller.";
  return null;
}
