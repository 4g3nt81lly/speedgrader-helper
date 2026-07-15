import type { Nullable, SetOptional } from '#shared/types/utils';
import Decimal from 'decimal.js';
import * as z from 'zod';
import type { IRubric } from './Rubric';
import Rubric from './Rubric';

export const QuestionTypeSchema = z.enum([
	'multiple_choice_question',
	'true_false_question',
	'short_answer_question',
	'fill_in_multiple_blanks_question',
	'multiple_answers_question',
	'multiple_dropdowns_question',
	'matching_question',
	'numerical_question',
	'calculated_question',
	'essay_question',
]);

export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export interface IQuestion {
	id: string;
	body: string;
	type: QuestionType;
	points: string;

	rubric: Nullable<IRubric>;
	isFocused: boolean;
}

export default class Question {
	public static create(
		question: SetOptional<IQuestion, 'rubric' | 'isFocused'>
	): IQuestion {
		return {
			id: question.id,
			body: question.body,
			type: question.type,
			points: Decimal(question.points).toString(),

			rubric: question.rubric ? Rubric.create(question.rubric) : null,
			isFocused: question.isFocused ?? false,
		};
	}
}

export const questionTypeDisplayName: Record<QuestionType, string> = {
	multiple_choice_question: 'Multiple Choice',
	true_false_question: 'True/False',
	short_answer_question: 'Short Answer',
	fill_in_multiple_blanks_question: 'Fill in the Blanks',
	multiple_answers_question: 'Multiple Answers',
	multiple_dropdowns_question: 'Multiple Dropdowns',
	matching_question: 'Matching',
	numerical_question: 'Numerical',
	calculated_question: 'Calculated',
	essay_question: 'Essay',
};
