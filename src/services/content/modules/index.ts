import type { QuizLoaderPayload } from '#background/loader';
import type { AppSettings } from '#shared/settings';
import { type QuizInjector, NewSGQuizInjector, OldSGQuizInjector } from './QuizInjector';
import { type SGQuizLoader, NewSGQuizLoader, OldSGQuizLoader } from './SGQuizLoader';

export type SGQuizLoaderType = keyof Pick<QuizLoaderPayload, 'oldSG' | 'newSG'>;

export const sgQuizLoaders: {
	[Type in SGQuizLoaderType]: new (appSettings: AppSettings) => SGQuizLoader<Type>;
} = {
	oldSG: OldSGQuizLoader,
	newSG: NewSGQuizLoader,
};

export const quizInjectorTypes = ['oldSG', 'newSG'] as const;

export type QuizInjectorType = (typeof quizInjectorTypes)[number];

export const quizInjectors: Record<
	QuizInjectorType,
	new (canonicalUrl: string) => QuizInjector
> = {
	oldSG: OldSGQuizInjector,
	newSG: NewSGQuizInjector,
};
