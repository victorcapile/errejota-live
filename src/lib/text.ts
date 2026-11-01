/**
 * Normaliza texto para busca: sem acentos, minúsculo e com espaços simples.
 * O mesmo formato é usado em `search_text` no seed e nas consultas.
 */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function tokenizeSearch(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

export function buildSearchText(parts: Array<string | null | undefined>): string {
  return normalizeText(parts.filter(Boolean).join(" "));
}
