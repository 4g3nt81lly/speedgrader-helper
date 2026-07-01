import { useEffect, useState, type MouseEvent } from 'react';
import type { IQuestion } from '~/models/Question';
import { addContentEventListener, ContentEvent } from '../event';
import globals from '../global';

type QuestionNavBarProps = {
	question: Pick<IQuestion, 'id'>;

	iframeWindow: Window;
};

export default function QuestionNavBar(props: QuestionNavBarProps) {
	const { question, iframeWindow } = props;

	const [canNavigate, setCanNavigate] = useState(true);

	function handleNavigate(event: MouseEvent<HTMLButtonElement>) {
		if (!canNavigate) return;
		setCanNavigate(false);

		globals.quizLastGradedQuestionId = question.id;

		const direction = (event.target as HTMLButtonElement).name as 'prev' | 'next';
		globals.submitFeedback!(direction);
	}

	useEffect(() => {
		const removeBeginSubmitFeedbackHandler = addContentEventListener(
			ContentEvent.beginSubmitFeedback,
			() => setCanNavigate(false),
			iframeWindow
		);
		const removeEndSubmitFeedbackHandler = addContentEventListener(
			ContentEvent.endSubmitFeedback,
			() => setCanNavigate(true),
			iframeWindow
		);
		return () => {
			removeBeginSubmitFeedbackHandler();
			removeEndSubmitFeedbackHandler();
		};
	}, []);

	return (
		<div className="absolute inset-0 my-2.5 flex justify-center gap-5">
			<button title="Previous" name="prev" disabled={!canNavigate} onClick={handleNavigate}>
				Prev
			</button>
			<button title="Next" name="next" disabled={!canNavigate} onClick={handleNavigate}>
				Next
			</button>
		</div>
	);
}
