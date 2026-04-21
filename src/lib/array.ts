export const areArraysEqual = <T>(
  arr1: T[] | undefined,
  arr2: T[] | undefined,
): boolean => {
  return JSON.stringify(arr1 ?? []) === JSON.stringify(arr2 ?? []);
};
