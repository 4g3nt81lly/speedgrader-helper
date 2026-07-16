import type { AppSettings } from '#shared/settings';
import type { QuizInjectorType } from '#shared/types/injector';
import type { SGQuizLoaderType } from '#shared/types/loader';
import { type QuizInjector, NewSGQuizInjector, OldSGQuizInjector } from './QuizInjector';
import { type SGQuizLoader, NewSGQuizLoader, OldSGQuizLoader } from './SGQuizLoader';

export const sgQuizLoaders: {
	[Type in SGQuizLoaderType]: new (appSettings: AppSettings) => SGQuizLoader<Type>;
} = {
	oldSG: OldSGQuizLoader,
	newSG: NewSGQuizLoader,
};

export const quizInjectors: Record<
	QuizInjectorType,
	new (canonicalUrl: string) => QuizInjector
> = {
	oldSG: OldSGQuizInjector,
	newSG: NewSGQuizInjector,
};
