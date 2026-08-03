import { feedbackSubmissionStrategies } from '#content/modules';
import type { GradingContext } from '#content/stores/GradingContext';
import type { IQuestion } from '#models/Question';
import type { FeedbackSubmissionStrategy } from '#shared/types/strategy';

type SubmitFeedbackResult =
	| { success: false; error: string }
	| { success: true; submittedQuestions: Set<IQuestion['id']> };

export default async function submitFeedback(
	gradingContext: GradingContext,
	strategyName: FeedbackSubmissionStrategy
): Promise<SubmitFeedbackResult> {
	const strategy = new feedbackSubmissionStrategies[strategyName]();
	const [formData, targetQuestions] = strategy.getFormData(gradingContext);
	if (targetQuestions.size === 0) {
		return { success: true, submittedQuestions: targetQuestions };
	}
	console.info(
		`Submitting feedback for ${[...targetQuestions].join(', ')}:`,
		Object.fromEntries(formData.entries())
	);
	const { submissionForm } = gradingContext;
	try {
		var response = await fetch(submissionForm.action, {
			method: submissionForm.method,
			body: formData,
			redirect: 'follow',
		});
	} catch (error) {
		console.error('Failed to submit form data:', error);
		return {
			success: false,
			error: `Failed to submit form data: ${error instanceof Error ? error.message : 'unknown error'}.`,
		};
	}
	if (!response.ok) {
		console.error('Failed to submit feedback:', response);
		return {
			success: false,
			error: 'Failed to submit feedback: Canvas responded with an error.',
		};
	}
	return { success: true, submittedQuestions: targetQuestions };
}
