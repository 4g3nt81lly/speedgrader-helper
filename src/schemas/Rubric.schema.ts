import z from 'zod';
import { PointsStringSchema } from './shared.schema';

export const RubricItemSchema = z.object({
	id: z.uuidv4({
		error: (error) => `Invalid rubric item ID "${error.input}", must be UUIDv4.`,
	}),
	description: z.string({ error: 'Invalid rubric item description type.' }),
	points: PointsStringSchema,
});

export const GradingModeSchema = z.enum(['positive', 'negative'], {
	error: (error) => `Invalid grading mode "${error.input}".`,
});

export const RubricSchema = z.object({
	items: z.array(RubricItemSchema, { error: 'Invalid rubric items type.' }),
	gradingMode: GradingModeSchema,
});
