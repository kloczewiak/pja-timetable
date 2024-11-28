import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function groupBy<
  T,
  K extends keyof T,
  KeyType extends Extract<T[K], string | number | symbol>,
>(items: T[], key: K): Record<KeyType, Omit<T, K>[]> {
  return items.reduce(
    (result, item) => {
      const group = item[key] as KeyType;
      if (!result[group]) {
        result[group] = [];
      }
      const { [key]: _, ...rest } = item;
      result[group].push(rest);
      return result;
    },
    {} as Record<KeyType, Omit<T, K>[]>,
  );
}
