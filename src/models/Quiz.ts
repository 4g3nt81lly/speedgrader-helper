import type { ExportedQuizJson } from '#schemas/ExportedQuizJson.schema';
import type { Nullable, SetOptional } from '#shared/types/utils';
import { isDecimalWithinRange } from '#shared/utils/decimal';
import Decimal from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';
import type { IQuestion } from './Question';
import Question from './Question';
import { RubricItem, type IRubricItem } from './RubricItem';

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
		quiz: SetOptional<IQuiz, 'id' | 'questions' | 'isEnabled' | 'focusMode'>
	): IQuiz {
		return {
			id: quiz.id ?? uuidv4(),
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
		newQuestion: Omit<IQuestion, 'id'>
	): IQuiz {
		const index = quiz.questions.findIndex((question) => question.id === questionId);
		if (index < 0) {
			return quiz;
		}
		const questions = [...quiz.questions];
		questions[index] = { ...newQuestion, id: questionId };
		return { ...quiz, questions };
	}

	public static updateQuestions(
		quiz: IQuiz,
		transform: (question: Readonly<IQuestion>) => IQuestion
	): IQuiz {
		return { ...quiz, questions: quiz.questions.map(transform) };
	}

	public static fromExported(exported: ExportedQuizJson, quiz?: IQuiz): IQuiz {
		const rubricMap: Record<IQuestion['id'], IQuestion['rubric']> = Object.fromEntries(
			exported.questions.map((question) => [question.id, question.rubric])
		);
		const baseQuiz = quiz ?? exported;
		const newQuestions = baseQuiz.questions.map((question) => {
			const newRubric = rubricMap[question.id];
			if (!newRubric || newRubric.items.length === 0) {
				return Question.create(question);
			}
			const rubricItemIds = new Set<IRubricItem['id']>();
			let invalidState: Nullable<{ item: IRubricItem; message: string }> = null;

			const newRubricItems: IRubricItem[] = [];
			for (const newItem of newRubric.items) {
				if (!newItem.description) {
					// Skip rubric items with empty description
					continue;
				}
				if (rubricItemIds.has(newItem.id)) {
					invalidState = {
						item: newItem,
						message: `Duplicate rubric item ID "${newItem.id}".`,
					};
					break;
				}
				if (!isDecimalWithinRange(Decimal.abs(newItem.points), 0, question.points)) {
					invalidState = {
						item: newItem,
						message: `Rubric item "${newItem.id}" has unexpected points "${newItem.points}".`,
					};
					break;
				}
				rubricItemIds.add(newItem.id);
				newRubricItems.push(RubricItem.create(newItem));
			}
			if (invalidState) {
				throw new Error(invalidState.message);
			}
			return Question.create({
				...question,
				rubric: { ...newRubric, items: newRubricItems },
			});
		});
		return Quiz.create({ ...baseQuiz, questions: newQuestions });
	}

	public static toExported(quiz: IQuiz): ExportedQuizJson {
		return {
			canvasId: quiz.canvasId,
			courseId: quiz.courseId,
			url: quiz.url,
			title: quiz.title,
			questions: quiz.questions,
		};
	}
}
