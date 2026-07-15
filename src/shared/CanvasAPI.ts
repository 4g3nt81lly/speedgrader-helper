import { CanvasCourseSchema, type CanvasCourse } from '#schemas/CanvasCourse.schema';
import {
	CanvasQuizQuestionSchema,
	CanvasQuizSchema,
	type CanvasQuiz,
	type CanvasQuizQuestion,
} from '#schemas/CanvasQuiz.schema';
import z from 'zod';
import Constants from './constants';

export default class CanvasAPI {
	private static timeoutMS = 10 * Constants.TOOLTIP_ENTER_DELAY;

	private baseURL: string;
	private accessToken: string;

	public constructor(baseURL: string, accessToken: string) {
		this.baseURL = baseURL;
		this.accessToken = accessToken;
	}

	public async getCourses(): Promise<CanvasCourse[]> {
		try {
			var courses = await this.get('/api/v1/courses', z.array(CanvasCourseSchema));
		} catch (error) {
			throw new Error(
				`Unable to fetch Canvas courses: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
		return courses;
	}

	public async getQuizzes(courseId: string): Promise<CanvasQuiz[]> {
		try {
			var quizzes = await this.get(
				`/api/v1/courses/${courseId}/quizzes`,
				z.array(CanvasQuizSchema)
			);
		} catch (error) {
			throw new Error(
				`Unable to fetch quizzes for Canvas course ID ${courseId}: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
		return quizzes;
	}

	public async getQuiz(courseId: string, quizId: string): Promise<CanvasQuiz> {
		try {
			var quiz = await this.get(
				`/api/v1/courses/${courseId}/quizzes/${quizId}`,
				CanvasQuizSchema
			);
		} catch (error) {
			throw new Error(
				`Unable to fetch Canvas quiz with ID "${quizId}": ${error instanceof Error ? error.message : 'Unknown error'}.`
			);
		}
		if (!quiz.published) {
			throw new Error(
				`Cannot retrieve SpeedGrader URL because Quiz with ID "${quizId}" is unpublished.`
			);
		}
		return quiz;
	}

	public async getQuizQuestions(
		courseId: string,
		quizId: string
	): Promise<CanvasQuizQuestion[]> {
		try {
			var quizQuestions = await this.get(
				`/api/v1/courses/${courseId}/quizzes/${quizId}/questions`,
				z.array(CanvasQuizQuestionSchema)
			);
		} catch (error) {
			throw new Error(
				`Unable to fetch Canvas quiz questions with ID "${quizId}": ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
		return quizQuestions;
	}

	private async get<Schema extends z.ZodType>(
		url: string,
		schema: Schema
	): Promise<z.infer<Schema>> {
		try {
			var response = await fetch(new URL(url, this.baseURL), {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${this.accessToken}`,
					Accept: 'application/json+canvas-string-ids',
				},
				signal: AbortSignal.timeout(CanvasAPI.timeoutMS),
			});
		} catch (error) {
			let message = 'Unknown error';
			if (error instanceof Error) {
				if (error.name === 'TimeoutError') {
					message = `Timed out (${CanvasAPI.timeoutMS}).`;
				} else {
					message = error.message;
				}
			}
			throw new Error(`Failed to send Canvas API request: ${message}.`);
		}
		try {
			var jsonResponse = await response.json();
		} catch (error) {
			throw new Error(
				`Failed to parse Canvas API response: ${error instanceof Error ? error.message : 'Unknown error'}.`
			);
		}
		if (!response.ok) {
			throw new Error(
				`Unexpected status code ${response.status}: ${this.getErrorMessage(jsonResponse)}`
			);
		}
		const parseResponse = schema.safeParse(jsonResponse);
		if (!parseResponse.success) {
			throw new Error(
				`Canvas API returned unexpected data: ${parseResponse.error.message}`
			);
		}
		return parseResponse.data;
	}

	private getErrorMessage(jsonResponse: unknown) {
		const parseResult = CanvasErrorResponseSchema.safeParse(jsonResponse);
		let message = 'Unknown error';
		if (parseResult.success) {
			const canvasErrorMessage = parseResult.data.errors[0]!.message;
			message = parseResult.data.status
				? `${parseResult.data.status}, ${canvasErrorMessage}`
				: canvasErrorMessage;
		} else {
			console.error('Error parsing Canvas error response:', jsonResponse);
		}
		return message;
	}
}

const CanvasErrorResponseSchema = z.object({
	status: z.string().optional(),
	errors: z
		.array(
			z.object({
				message: z.string(),
			})
		)
		.nonempty(),
});

type CanvasErrorResponse = z.infer<typeof CanvasErrorResponseSchema>;
