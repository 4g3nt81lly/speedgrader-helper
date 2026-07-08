import { useState, type MouseEvent } from 'react';
import type { IQuestion } from '~/models/Question';
import gradingContext from '../GradingContext';
import { useFeedbackSubmitState } from '../hooks';

type QuestionNavBarProps = {
	question: Pick<IQuestion, 'id'>;
};

export default function QuestionNavBar(props: QuestionNavBarProps) {
	const { question } = props;

	const [canNavigate, setCanNavigate] = useState(true);
	const isSubmitting = useFeedbackSubmitState();

	function handleNavigate(event: MouseEvent<HTMLButtonElement>) {
		if (!canNavigate || isSubmitting) return;
		setCanNavigate(false);

		gradingContext.lastGradedQuestionId = question.id;
		gradingContext.navigateSubmission((event.target as HTMLButtonElement).name as 'prev' | 'next');
	}

	return (
		<div className="absolute inset-0 mx-auto my-2.5 flex w-fit justify-center gap-5">
			<button
				title="Previous"
				name="prev"
				disabled={!canNavigate || isSubmitting}
				onClick={handleNavigate}
			>
				Prev
			</button>
			<button
				title="Next"
				name="next"
				disabled={!canNavigate || isSubmitting}
				onClick={handleNavigate}
			>
				Next
			</button>
		</div>
	);
}
