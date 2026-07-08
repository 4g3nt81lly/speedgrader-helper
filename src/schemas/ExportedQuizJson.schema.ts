import * as z from 'zod';

export const ExportedRubricJsonSchema = z.object({
	courseId: z.stringFormat('course-id', /^\d+$/),
	assignmentId: z.stringFormat('assignment-id', /^\d+$/),
	url: z.url(),
	rubrics: z.array(
		z.object({
			question: z.object({ id: z.string() }),
			rubric: z.object({
				items: z.array(
					z.object({
						id: z.uuidv4(),
						description: z.string(),
						points: z.stringFormat(
							'points',
							(pointsString) => pointsString && isFinite(Number(pointsString))
						),
					})
				),
				gradingMode: z.union([z.literal('positive'), z.literal('negative')]),
			}),
		})
	),
});

export type ExportedRubricJson = z.infer<typeof ExportedRubricJsonSchema>;
