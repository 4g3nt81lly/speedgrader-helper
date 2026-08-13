import Selectors from '#content/selectors';
import type { IQuestion } from '#models/Question';
import { errorBoundary } from '#shared/utils/browser/ErrorBoundary';
import ActionBar from './ActionBar';
import MessageBanner from './MessageBanner';
import RubricControls from './RubricControls';
import useGradingBox from './hooks/useGradingBox';

export type QuestionGradingBoxProps = {
	questionId: IQuestion['id'];
};

function QuestionGradingBox({ questionId }: QuestionGradingBoxProps) {
	const { isVisible } = useGradingBox(questionId);

	return (
		isVisible && (
			<div
				className={`${Selectors.app.GRADING_BOX_CLASS} mt-8 flex flex-col gap-1.5 border-[0.75px] p-5`}
			>
				<MessageBanner questionId={questionId} />
				<RubricControls questionId={questionId} />

				<hr className="my-3 w-full border-[0.5px]" />

				<ActionBar questionId={questionId} />
			</div>
		)
	);
}

export default errorBoundary(QuestionGradingBox, {
	fallback: (
		<div className="flex items-center justify-center p-10">
			Something went wrong while rendering the grading box for this question. Please reload the
			page!
		</div>
	),
	onError(error, _info) {
		console.error(`Error in ${QuestionGradingBox.name}:`, error);
	},
});
