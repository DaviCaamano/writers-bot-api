export const padArray = <T>(arr: T[], length: number, paddingValue?: T): T[] => {
  if (arr.length >= length) return arr;

  return [...arr, ...Array(length - arr.length).fill(paddingValue)];
};
