export const compact = <T>(values: Array<T | null | undefined | false>) =>
  values.filter(Boolean) as T[];

export const createSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const uniqueBy = <T>(values: T[], getKey: (value: T) => string) => {
  const seen = new Set<string>();

  return values.filter((value) => {
    const key = getKey(value);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};
