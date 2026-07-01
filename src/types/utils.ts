export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type NonOptional<T> = Exclude<T, undefined>;

export type SetOptional<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>;
export type SetRequired<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;
export type SetNonNullable<T, K extends keyof T> = Omit<T, K> & {
	[P in K]: NonNullable<T[P]>;
};
