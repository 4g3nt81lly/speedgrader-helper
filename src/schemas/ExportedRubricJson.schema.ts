import * as z from 'zod';

export const ExportedRubricJsonSchema = z.object({
	courseId: z.string(),
	assignmentId: z.string(),
	url: z.url(),
	rubrics: z.array(
		z.object({
			question: z.object({ id: z.string() }),
			rubric: z.object({
				items: z.array(
					z.object({
						id: z.string(),
						description: z.string(),
						points: z.string(),
					})
				),
				gradingMode: z.union([z.literal('positive'), z.literal('negative')]),
			}),
		})
	),
});

export type ExportedRubricJson = z.infer<typeof ExportedRubricJsonSchema>;
