import type { ExportedRubricJson } from '#schemas/ExportedRubricJson.schema';
import type { SetOptional } from '#shared/types/utils';
import { v4 as uuidv4 } from 'uuid';
import type { IQuestion } from './Question';
import Question from './Question';

export interface IQuiz {
	id: string;
	courseId: string;
	assignmentId: string;
	url: string;
	title: string;
	questions: IQuestion[];

	focusMode: boolean;
}

export default class Quiz {
	public static create(
		quiz: SetOptional<Omit<IQuiz, 'id'>, 'questions' | 'focusMode'>
	): IQuiz {
		return {
			id: uuidv4(),
			courseId: quiz.courseId,
			assignmentId: quiz.assignmentId,
			url: quiz.url,
			title: quiz.title,
			questions: quiz.questions?.map((question) => Question.create(question)) ?? [],

			focusMode: quiz.focusMode ?? false,
		};
	}

	public static updateQuestion(
		quiz: IQuiz,
		questionId: IQuestion['id'],
		transform: (question: IQuestion) => IQuestion
	): IQuiz {
		const index = quiz.questions.findIndex((question) => question.id === questionId);
		if (index < 0) {
			return quiz;
		}
		const questions = [...quiz.questions];
		questions[index] = transform(questions[index]!);
		return { ...quiz, questions };
	}

	public static updateQuestions(
		quiz: IQuiz,
		transform: (question: IQuestion) => IQuestion
	): IQuiz {
		const questions = quiz.questions.map(transform);
		return { ...quiz, questions };
	}

	public static updateRubric(
		quiz: IQuiz,
		questionId: IQuestion['id'],
		transform: (rubric: IQuestion['rubric']) => IQuestion['rubric']
	): IQuiz {
		return this.updateQuestion(quiz, questionId, (question) => {
			return {
				...question,
				rubric: transform(question.rubric),
			};
		});
	}

	public static toExported(quiz: IQuiz): ExportedRubricJson {
		return {
			courseId: quiz.courseId,
			assignmentId: quiz.assignmentId,
			url: quiz.url,
			rubrics: quiz.questions.flatMap((question) => {
				if (!question.rubric) return [];
				return {
					question: { id: question.id },
					rubric: {
						items: question.rubric.items.map((item) => ({
							id: item.id,
							description: item.description,
							points: item.points,
						})),
						gradingMode: question.rubric.gradingMode,
					},
				};
			}),
		};
	}

	public static getExportedObjectURL(quiz: IQuiz): string {
		const data = this.toExported(quiz);
		const blob = new Blob([JSON.stringify(data, null, 4)], { type: 'application/json' });
		return URL.createObjectURL(blob);
	}
}
