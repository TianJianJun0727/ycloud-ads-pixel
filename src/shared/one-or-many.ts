export type OneOrMany<T> = T | readonly T[];

export const toArray = <T>(value: OneOrMany<T>): readonly T[] => (Array.isArray(value) ? value : [value as T]);
