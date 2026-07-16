export const quizInjectorTypes = ['oldSG', 'newSG'] as const;

export type QuizInjectorType = (typeof quizInjectorTypes)[number];
