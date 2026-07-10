export function checkFileSizeMb(file: File, maxMb: number): { ok: boolean; mb: number } {
  const mb = file.size / 1048576;
  return { ok: mb <= maxMb, mb };
}
