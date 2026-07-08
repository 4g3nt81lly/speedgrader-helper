import type { ExportedRubricJson } from '#schemas/ExportedQuizJson.schema';
import { isDecimalWithinRange } from '#shared/decimal';
import type { SetOptional } from '#shared/types/utils';
import Decimal from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';
import type { IQuestion } from './Question';
import Question from './Question';
import type { IRubric } from './Rubric';

export interface IQuiz {
	id: string;
	courseId: string;
	assignmentId: string;
	url: string;
	title: string;
	questions: IQuestion[];

	focusMode: boolean;
}

export default class Quiz {
	public static create(
		quiz: SetOptional<Omit<IQuiz, 'id'>, 'questions' | 'focusMode'>
	): IQuiz {
		return {
			id: uuidv4(),
			courseId: quiz.courseId,
			assignmentId: quiz.assignmentId,
			url: quiz.url,
			title: quiz.title,
			questions: quiz.questions?.map((question) => Question.create(question)) ?? [],

			focusMode: quiz.focusMode ?? false,
		};
	}

	public static updateQuestion(
		quiz: IQuiz,
		questionId: IQuestion['id'],
		transform: (question: IQuestion) => IQuestion
	): IQuiz {
		const index = quiz.questions.findIndex((question) => question.id === questionId);
		if (index < 0) {
			return quiz;
		}
		const questions = [...quiz.questions];
		questions[index] = transform(questions[index]!);
		return { ...quiz, questions };
	}

	public static updateQuestions(
		quiz: IQuiz,
		transform: (question: IQuestion) => IQuestion
	): IQuiz {
		const questions = quiz.questions.map(transform);
		return { ...quiz, questions };
	}

	public static updateRubric(
		quiz: IQuiz,
		questionId: IQuestion['id'],
		transform: (rubric: IQuestion['rubric']) => IQuestion['rubric']
	): IQuiz {
		return this.updateQuestion(quiz, questionId, (question) => {
			return {
				...question,
				rubric: transform(question.rubric),
			};
		});
	}

	public static fromExported(quiz: IQuiz, exported: ExportedRubricJson): IQuiz {
		const rubricMap: Record<IQuestion['id'], IRubric> = Object.fromEntries(
			exported.rubrics.map((rubric) => [rubric.question.id, rubric.rubric])
		);
		const newQuestions = quiz.questions.map((question) => {
			const newRubric = rubricMap[question.id];
			if (!newRubric || newRubric.items.length === 0) {
				return question;
			}
			const invalidItem = newRubric.items.find(
				(item) => !isDecimalWithinRange(Decimal.abs(item.points), 0, question.points)
			);
			if (invalidItem) {
				throw new Error(
					`Rubric item "${invalidItem.id}" has unexpected points "${invalidItem.points}"`
				);
			}
			return { ...question, rubric: newRubric };
		});
		return { ...quiz, questions: newQuestions };
	}

	public static toExported(quiz: IQuiz): ExportedRubricJson {
		return {
			courseId: quiz.courseId,
			assignmentId: quiz.assignmentId,
			url: quiz.url,
			rubrics: quiz.questions.flatMap((question) => {
				if (!question.rubric || question.rubric.items.length === 0) return [];
				return {
					question: { id: question.id },
					rubric: {
						items: question.rubric.items.map((item) => ({
							id: item.id,
							description: item.description,
							points: item.points,
						})),
						gradingMode: question.rubric.gradingMode,
					},
				};
			}),
		};
	}
}
