import { type QuizInjector, NewSGQuizInjector, OldSGQuizInjector } from './QuizInjector';
import { type QuizLoader, NewSGQuizLoader, OldSGQuizLoader } from './QuizLoader';

export const quizInjectorTypes = ['oldSG', 'newSG'] as const;

export type QuizInjectorType = (typeof quizInjectorTypes)[number];

export const quizInjectors: Record<QuizInjectorType, new () => QuizInjector> = {
	oldSG: OldSGQuizInjector,
	newSG: NewSGQuizInjector,
};

export const quizLoaderTypes = ['oldSG', 'newSG'] as const;

export type QuizLoaderType = (typeof quizLoaderTypes)[number];

export const quizLoaders: Record<QuizLoaderType, new () => QuizLoader> = {
	oldSG: OldSGQuizLoader,
	newSG: NewSGQuizLoader,
};
