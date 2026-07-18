import Patterns from '#shared/patterns';
import z from 'zod';
import { RubricSchema } from './Rubric.schema';
import { PointsStringSchema } from './shared.schema';

export const QuestionTypeSchema = z.enum(
	[
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
	],
	{ error: (error) => `Unknown question type "${error.input}".` }
);

export const QuestionSchema = z.object({
	id: z.stringFormat('question_id', Patterns.SG_QUESTION_ID, {
		error: (error) => `Invalid question ID "${error.input}".`,
	}),
	body: z.string('Invalid question body.'),
	type: QuestionTypeSchema,
	points: PointsStringSchema,

	rubric: RubricSchema.nullable(),
});
