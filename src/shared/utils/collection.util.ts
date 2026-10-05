export function groupBy<Item, Key extends string>(
  items: Item[],
  keySelector: (item: Item) => Key,
): Record<Key, Item[]> {
  return items.reduce<Record<string, Item[]>>((accumulator, item) => {
    const key = keySelector(item);
    accumulator[key] = [...(accumulator[key] ?? []), item];
    return accumulator;
  }, {}) as Record<Key, Item[]>;
}

export function sumBy<Item>(items: Item[], valueSelector: (item: Item) => number): number {
  return items.reduce((total, item) => total + valueSelector(item), 0);
}

export function uniqueBy<Item, Key>(items: Item[], keySelector: (item: Item) => Key): Item[] {
  const seen = new Set<Key>();
  return items.filter((item) => {
    const key = keySelector(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function paginate<Item>(items: Item[], page: number, perPage: number): Item[] {
  const start = Math.max(page - 1, 0) * perPage;
  return items.slice(start, start + perPage);
}
