import type { IQuestion } from './Question';
import type { IRubric } from './Rubric';
import type { IRubricItem } from './RubricItem';

export interface ISubmissionFeedback {
	submissionId: string;
	questions: {
		[quesitonId: IQuestion['id']]: QuestionFeedback;
	};
}

export type QuestionFeedback = {
	questionId: IQuestion['id'];
	comments: string;
} & (
	| {
			// Comments only
			gradingMode: null;
			rubricItems: null;
			manualPoints: null;
	  }
	| {
			// Manual points override
			gradingMode: null;
			rubricItems: null;
			manualPoints: string;
	  }
	| {
			// Rubric items selected
			gradingMode: IRubric['gradingMode'];
			rubricItems: IRubricItem[];
			manualPoints: null;
	  }
);
