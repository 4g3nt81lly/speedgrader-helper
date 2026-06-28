import type { QuestionFeedback } from '~/models/Feedback';
import type { IQuestion } from '~/models/Question';
import type { IQuiz } from '~/models/Quiz';
import type { Nullable } from '~/types/utils';
import Selectors from '../selectors';
import RubricControls from './RubricControls';
import useGradingState from './useGradingState';

export type GradingBoxProps = {
	submissionId: string;
	initialQuiz: IQuiz;
	initialQuestion: IQuestion;
	initialFeedback: Nullable<QuestionFeedback>;

	questionContainer: HTMLElement;
	pointsInput: HTMLInputElement;
	commentsTextarea: HTMLTextAreaElement;

	scrollIntoView: boolean;
};

export default function GradingBox(props: GradingBoxProps) {
	const { initialFeedback } = props;
	const {
		question,
		state,
		savedFeedback,
		isVisible,
		isSubmitting,
		rubricItemCanToggle,
		toggleSelectRubricItem,
		handleManualPointsChange,
		handleCommentsChange,
		handleRegrade,
		handleReset,
		handleSubmit,
	} = useGradingState(props);

	return (
		isVisible && (
			<div
				className={`${Selectors.app.GRADING_BOX_CLASS} mt-8 flex flex-col gap-1.5 border-[0.75px] p-5`}
			>
				{state.isInvalid && (
					<div className="mb-2 bg-red-200 p-2 leading-snug">
						❗️ Rubric has been updated and your{' '}
						{initialFeedback === null
							? 'tentative (not submitted) feedback is no longer valid. '
							: 'most-recent submitted feedback is no longer valid.'}{' '}
						For reference, the invalid feedback is kept below. Please regrade this question.
					</div>
				)}

				<RubricControls
					gradingState={state}
					isSubmitting={isSubmitting}
					checkRubricItemCanToggle={rubricItemCanToggle}
					toggleRubricItemSelection={toggleSelectRubricItem}
					handleCommentsChange={handleCommentsChange}
				/>
				<hr className="my-3 w-full border-[0.5px]" />

				<div className="flex justify-between gap-2">
					{/* Left controls */}
					<div className="flex items-center">
						<label className="mr-5 flex items-center gap-1.5">
							<span>Manual Points:</span>
							<input
								type="number"
								className="h-full w-[45px] py-1 pr-1 pl-1.5"
								value={state.manualPoints ?? ''}
								onChange={handleManualPointsChange}
								max={question.points}
								min="0"
								step="0.5"
								disabled={isSubmitting || state.isInvalid}
							/>
						</label>

						<div className="flex gap-2">
							<button
								type="button"
								className="px-1.5 py-1"
								disabled={isSubmitting}
								onClick={handleRegrade}
							>
								Regrade
							</button>
							<button
								type="button"
								className="px-1.5 py-1"
								disabled={isSubmitting || !savedFeedback}
								onClick={handleReset}
							>
								Reset
							</button>
						</div>
					</div>

					{/* Right controls */}
					<div className="flex items-center">
						<button
							type="submit"
							className="px-1.5 py-1"
							disabled={isSubmitting || !state.isDirty || state.isInvalid}
							onClick={handleSubmit}
						>
							{isSubmitting ? 'Submitting...' : 'Submit'}
						</button>
					</div>
				</div>
			</div>
		)
	);
}
