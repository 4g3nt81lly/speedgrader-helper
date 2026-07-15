import type { ExportedRubricJson } from '#schemas/ExportedQuizJson.schema';
import { isDecimalWithinRange } from '#shared/decimal';
import type { Nullable, SetOptional } from '#shared/types/utils';
import Decimal from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';
import type { IQuestion } from './Question';
import Question from './Question';
import type { IRubric } from './Rubric';
import type { IRubricItem } from './RubricItem';

export interface IQuiz {
	id: string;
	canvasId: string;
	courseId: string;
	url: string;
	title: string;
	questions: IQuestion[];

	isEnabled: boolean;
	focusMode: boolean;
}

export default class Quiz {
	public static create(
		quiz: SetOptional<Omit<IQuiz, 'id'>, 'questions' | 'isEnabled' | 'focusMode'>
	): IQuiz {
		return {
			id: uuidv4(),
			canvasId: quiz.canvasId,
			courseId: quiz.courseId,
			url: quiz.url,
			title: quiz.title,
			questions: quiz.questions?.map((question) => Question.create(question)) ?? [],

			isEnabled: quiz.isEnabled ?? true,
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
			const itemIds = new Set<IRubricItem['id']>();
			let invalidState: Nullable<{ item: IRubricItem; message: string }> = null;
			for (const newItem of newRubric.items) {
				if (itemIds.has(newItem.id)) {
					invalidState = {
						item: newItem,
						message: `Duplicate rubric item ID "${newItem.id}"`,
					};
					break;
				}
				if (!isDecimalWithinRange(Decimal.abs(newItem.points), 0, question.points)) {
					invalidState = {
						item: newItem,
						message: `Rubric item "${newItem.id}" has unexpected points "${newItem.points}"`,
					};
					break;
				}
				itemIds.add(newItem.id);
				// Stardardize points
				newItem.points = Decimal(newItem.points).toString();
			}
			if (invalidState) {
				throw new Error(invalidState.message);
			}
			return { ...question, rubric: newRubric };
		});
		return { ...quiz, questions: newQuestions };
	}

	public static toExported(quiz: IQuiz): ExportedRubricJson {
		return {
			canvasCourseId: quiz.courseId,
			canvasQuizId: quiz.canvasId,
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
