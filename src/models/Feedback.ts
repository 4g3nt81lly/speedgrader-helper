import type { IQuestion } from './Question';
import type { IQuiz } from './Quiz';
import type { GradingMode } from './Rubric';
import type { IRubricItem } from './RubricItem';

export interface IQuizSubmissionFeedback {
	quizId: IQuiz['id'];
	submissionId: string;
	questions: Record<IQuestion['id'], QuestionFeedback>;
}

export type QuestionFeedback = {
	questionId: IQuestion['id'];
	comments: string;
	gradingMode: GradingMode;
	rubricItems: IRubricItem[];
};
