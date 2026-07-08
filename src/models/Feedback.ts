import type { IQuestion } from './Question';
import type { GradingMode } from './Rubric';
import type { IRubricItem } from './RubricItem';

export interface ISubmissionFeedback {
	submissionId: string;
	questions: {
		[questionId: IQuestion['id']]: QuestionFeedback;
	};
}

export type QuestionFeedback = {
	questionId: IQuestion['id'];
	comments: string;
	gradingMode: GradingMode;
	rubricItems: IRubricItem[];
};
