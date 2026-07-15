import Patterns from '#shared/patterns';
import z from 'zod';

export const CanvasCourseSchema = z.object({
	id: z.stringFormat('course_id', Patterns.CANVAS_COURSE_ID),
	name: z.string(),
	course_code: z.string(),
});

export type CanvasCourse = z.infer<typeof CanvasCourseSchema>;
