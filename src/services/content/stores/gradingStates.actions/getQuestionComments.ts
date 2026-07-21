import type { QuestionGradingBoxState } from '#content/stores/QuestionGradingState';
import type { QuestionFeedback } from '#models/Feedback';
import Rubric from '#models/Rubric';

export function getFullComments(
	boxState: Pick<
		QuestionGradingBoxState,
		'rubricItems' | 'selectedRubricItems' | 'comments'
	>
) {
	if (!boxState.selectedRubricItems) {
		return boxState.comments;
	}
	const rubricComments = Rubric.getComments(
		boxState.rubricItems.flatMap((rubricItem) => {
			if (!boxState.selectedRubricItems![rubricItem.id]) return [];
			return rubricItem.new ?? rubricItem.old;
		})
	);
	if (!rubricComments) {
		return boxState.comments;
	}
	if (!boxState.comments) {
		return rubricComments;
	}
	return `${rubricComments}\n\n${boxState.comments}`;
}

export function getFeedbackComments(
	feedback: Pick<QuestionFeedback, 'rubricItems' | 'comments'>
) {
	const rubricComments = Rubric.getComments(feedback.rubricItems);
	if (!rubricComments) {
		return feedback.comments;
	}
	if (!feedback.comments) {
		return rubricComments;
	}
	return `${rubricComments}\n\n${feedback.comments}`;
}
