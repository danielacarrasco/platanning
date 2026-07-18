// Converts snake_case SQLite rows into camelCase app objects, coercing
// known boolean-flag columns (is_*, can_*, archived) from 0/1 to boolean.
export function toCamel<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const isBooleanFlag =
      key.startsWith("is_") || key.startsWith("can_") || key === "archived";
    out[camelKey] = isBooleanFlag ? Boolean(value) : value;
  }
  return out as T;
}

export function toCamelList<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((r) => toCamel<T>(r));
}
