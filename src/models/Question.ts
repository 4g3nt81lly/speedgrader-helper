import type { Nullable, SetOptional } from '~/types/utils';
import type { IRubric } from './Rubric';
import Rubric from './Rubric';

export const enum QuestionType {
	MultipleChoice = 'multiple_choice_question',
	TrueFalse = 'true_false_question',
	ShortAnswer = 'short_answer_question',
	FillInMultipleBlanks = 'fill_in_multiple_blanks_question',
	MultipleAnswers = 'multiple_answers_question',
	MultipleDropdowns = 'multiple_dropdowns_question',
	Matching = 'matching_question',
	Numerical = 'numerical_question',
	Calculated = 'calculated_question',
	Essay = 'essay_question',
}

export const questionTypeDisplayName: Record<QuestionType, string> = {
	[QuestionType.MultipleChoice]: 'Multiple Choice',
	[QuestionType.TrueFalse]: 'True/False',
	[QuestionType.ShortAnswer]: 'Short Answer',
	[QuestionType.FillInMultipleBlanks]: 'Fill in the Blanks',
	[QuestionType.MultipleAnswers]: 'Multiple Answers',
	[QuestionType.MultipleDropdowns]: 'Multiple Dropdowns',
	[QuestionType.Matching]: 'Matching',
	[QuestionType.Numerical]: 'Numerical',
	[QuestionType.Calculated]: 'Calculated',
	[QuestionType.Essay]: 'Essay',
};

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
			points: question.points,

			rubric: question.rubric ? Rubric.create(question.rubric) : null,
			isFocused: question.isFocused ?? false,
		};
	}
}
