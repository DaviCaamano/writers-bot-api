type LinkedNode = {
  predecessorId: string | null;
  successorId: string | null;
};

export function orderLinkedDocs<T extends LinkedNode>(items: T[], getId: (item: T) => string): T[] {
  if (items.length === 0) return [];

  const byId = new Map<string, T>();
  for (const item of items) {
    byId.set(getId(item), item);
  }

  const head = items.find((item) => item.predecessorId === null);
  if (!head) {
    throw new Error('No head node found');
  }

  const result: T[] = [];
  const seen = new Set<string>();
  let current: T | undefined = head;

  while (current) {
    const currentId = getId(current);
    if (seen.has(currentId)) {
      throw new Error('Cycle detected in linked list');
    }
    result.push(current);
    seen.add(currentId);

    if (current.successorId === null) break;
    current = byId.get(current.successorId);
    if (!current) throw new Error('Broken chain: successor not found');
  }

  if (result.length !== items.length) {
    throw new Error('List is disconnected or malformed');
  }

  return result;
}
