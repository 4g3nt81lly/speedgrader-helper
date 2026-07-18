import Patterns from '#shared/patterns';
import z from 'zod';
import { QuestionSchema } from './Question.schema';

export const ExportedQuizJsonSchema = z.object(
	{
		canvasId: z.stringFormat('canvas_id', Patterns.CANVAS_QUIZ_ID, {
			error: (error) => `Invalid Canvas quiz ID "${error.input}".`,
		}),
		courseId: z.stringFormat('course_id', Patterns.CANVAS_COURSE_ID, {
			error: (error) => `Invalid Canvas course ID "${error.input}".`,
		}),
		url: z.url('Invalid quiz URL.'),
		title: z.string('Invalid quiz title type.').nonempty('Quiz title must not be empty.'),
		questions: z.array(QuestionSchema, 'Invalid quiz questions type.'),
	},
	'Invalid quiz object type.'
);

export type ExportedQuizJson = z.infer<typeof ExportedQuizJsonSchema>;
