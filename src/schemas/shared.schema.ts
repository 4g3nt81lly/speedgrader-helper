import Patterns from '#shared/patterns';
import z from 'zod';

export const PointsStringSchema = z.stringFormat('points', Patterns.DECIMAL_STRING, {
	error: (error) => `Invalid points string "${error.input}".`,
});
