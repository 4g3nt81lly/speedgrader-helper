import { GradingModeSchema } from '#models/Rubric';
import Patterns from '#shared/patterns';
import z from 'zod';

export const ExportedRubricJsonSchema = z.object({
	canvasCourseId: z.stringFormat('canvas_course_id', Patterns.CANVAS_COURSE_ID),
	canvasQuizId: z.stringFormat('canvas_quiz_id', Patterns.CANVAS_QUIZ_ID),
	url: z.url(),
	rubrics: z.array(
		z.object({
			question: z.object({ id: z.string() }),
			rubric: z.object({
				items: z.array(
					z.object({
						id: z.uuidv4(),
						description: z.string(),
						points: z.stringFormat('points', Patterns.DECIMAL_STRING),
					})
				),
				gradingMode: GradingModeSchema,
			}),
		})
	),
});

export type ExportedRubricJson = z.infer<typeof ExportedRubricJsonSchema>;
