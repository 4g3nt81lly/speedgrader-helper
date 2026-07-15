import type { QuizLoaderType } from '#background/loader';
import type { QuizInjectorType } from '#content/modules';
import type { FeedbackSubmissionStrategy } from '#content/submit';

export const feedbackSubmissionStrategyNames: Record<FeedbackSubmissionStrategy, string> =
	{
		all: 'All',
		focused: 'Focused',
		updated: 'Updated',
	};

export const feedbackSubmissionStrategyDescriptions: Record<
	FeedbackSubmissionStrategy,
	string
> = {
	all: 'Submit feedback for all questions. This is the default SpeedGrader behaviour. It is possible to accidentally overwrite feedback submitted by other graders for the same submission at the same time.',
	focused:
		'Submit feedback only for questions in focus. This aims to avoid overwriting grades for other questions submitted by other graders for the same submission at the same time.',
	updated:
		'Submit feedback only for questions whose grades and comments have been updated. This aims to avoid overwriting grades for other questions submitted by other graders for the same submission at the same time.',
};

export const quizInjectorNames: Record<QuizInjectorType, string> = {
	oldSG: 'Old SG',
	newSG: 'New SG (Experimental)',
};

export const quizLoaderNames: Record<QuizLoaderType, string> = {
	oldSG: 'Old SG',
	newSG: 'New SG (Experimental)',
	canvasAPI: 'Canvas API',
};
