import type { StoreApi, UseBoundStore } from 'zustand';

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type NonOptional<T> = Exclude<T, undefined>;

export type SetOptional<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>;
export type SetNullable<T, K extends keyof T> = Omit<T, K> & {
	[P in K]: Nullable<T[P]>;
};
export type SetRequired<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;
export type SetNonNullable<T, K extends keyof T> = Omit<T, K> & {
	[P in K]: NonNullable<T[P]>;
};

export type BindCallback<Callback, This> = Callback extends (
	...args: infer Parameters
) => infer Return
	? (this: This, ...args: Parameters) => Return
	: never;

export type ZustandStore<State> = UseBoundStore<StoreApi<State>>;
