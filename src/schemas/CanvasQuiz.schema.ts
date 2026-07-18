import { QuestionTypeSchema } from './Question.schema';
import Patterns from '#shared/patterns';
import z from 'zod';

export const CanvasQuizPermissionsSchema = z.object({
	read: z.boolean(),
	submit: z.boolean(),
	create: z.boolean(),
	manage: z.boolean(),
	read_statistics: z.boolean(),
	review_grades: z.boolean(),
	update: z.boolean(),
});

export type CanvasQuizPermissions = z.infer<typeof CanvasQuizPermissionsSchema>;

export const CanvasQuizSchema = z.object({
	id: z.stringFormat('quiz_id', Patterns.CANVAS_QUIZ_ID),
	title: z.string().nonempty(),
	html_url: z.url(),
	description: z.string(),
	quiz_type: z.enum(['practice_quiz', 'assignment', 'graded_survey', 'survey']),
	question_count: z.int().nonnegative(),
	points_possible: z.number().nonnegative(),
	published: z.boolean(),
	speed_grader_url: z.url(),
	permissions: CanvasQuizPermissionsSchema,
});

export type CanvasQuiz = z.infer<typeof CanvasQuizSchema>;

export const CanvasQuizQuestionSchema = z.object({
	id: z.stringFormat('quiz_question_id', Patterns.CANVAS_QUIZ_QUESTION_ID),
	question_name: z.string(),
	question_type: QuestionTypeSchema,
	question_text: z.string(),
	points_possible: z.number().nonnegative(),
});

export type CanvasQuizQuestion = z.infer<typeof CanvasQuizQuestionSchema>;
