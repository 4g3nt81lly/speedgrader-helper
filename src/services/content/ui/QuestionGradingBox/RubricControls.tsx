import type { DiffRubricItem } from '#content/stores/QuestionGradingState';
import type { IQuestion } from '#models/Question';
import { isDecimalPositive } from '#shared/utils/decimal';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import useRubricControls from './hooks/useRubricControls';

type RubricControlsProps = {
	questionId: IQuestion['id'];
};

export default function RubricControls({ questionId }: RubricControlsProps) {
	const {
		boxState,
		canGrade,
		checkRubricItemCanToggle,
		toggleRubricItemSelection,
		handleCommentsChange,
	} = useRubricControls(questionId);

	return (
		<div className="flex flex-col gap-3">
			{boxState.rubricItems && (
				<div className="flex flex-col gap-1">
					{boxState.rubricItems.map((rubricItem) => {
						return (
							<RubricItemControls
								key={rubricItem.id}
								rubricItem={rubricItem}
								isSelected={!!boxState.selectedRubricItems?.[rubricItem.id]}
								canToggle={checkRubricItemCanToggle(rubricItem)}
								toggleSelect={() => toggleRubricItemSelection(rubricItem)}
							/>
						);
					})}
				</div>
			)}
			<div className="flex flex-wrap gap-2">
				<span className="whitespace-nowrap">Comments:</span>
				<textarea
					className="p-1 font-[inherit] text-inherit"
					value={boxState.comments}
					onChange={handleCommentsChange}
					disabled={!canGrade}
				/>
			</div>
		</div>
	);
}

type RubricItemControlsProps = {
	rubricItem: DiffRubricItem;
	isSelected: boolean;
	canToggle: boolean;
	toggleSelect(): void;
};

/**
 * Case 1: Rubric item is new or has no change
 *   [?] (±x) Rubric description (new)
 *
 * Case 2: Rubric item was removed
 *   [x] (±x) Rubric description (old)
 *       -> This rubric item was removed
 *
 * Case 3: Rubric item was modified (description or points)
 *   [x] (±x) Rubric description (old)
 *       -> (±y) New rubric description
 *
 * Case 2 and 3 are detectable ONLY WHEN the old rubric item was selected
 */

function RubricItemControls(props: RubricItemControlsProps) {
	const {
		rubricItem: { status, old: oldItem, new: newItem },
		isSelected,
		canToggle,
		toggleSelect,
	} = props;

	const upperItem = oldItem ?? newItem;
	const lowerItem = newItem;
	// Show diff IFF modified or removed
	const showDiff = status === 'modified' || status === 'removed';

	return (
		<div className="flex flex-col">
			<label className="flex cursor-pointer items-start gap-1.5">
				<div className="flex items-center gap-1.5">
					<input
						type="checkbox"
						className="mt-0.5"
						checked={isSelected}
						disabled={!canToggle}
						onChange={toggleSelect}
					/>
					<span
						style={{
							color: isDecimalPositive(upperItem.points) ? 'green' : 'red',
							fontWeight: 'bold',
						}}
					>
						({isDecimalPositive(upperItem.points) ? '+' : ''}
						{upperItem.points})
					</span>
				</div>
				<span className="mt-0.5 leading-tight whitespace-pre-wrap">{upperItem.description}</span>
			</label>
			{showDiff &&
				(lowerItem ? (
					<div className="ml-7 flex items-start gap-1.5">
						<div className="flex items-center gap-1.5">
							<span className="text-md">
								<SubdirectoryArrowRightIcon fontSize="inherit" />
							</span>
							<span
								style={{
									color: isDecimalPositive(lowerItem.points) ? 'green' : 'red',
									fontWeight: 'bold',
								}}
							>
								({isDecimalPositive(lowerItem.points) ? '+' : ''}
								{lowerItem.points})
							</span>
						</div>
						<span className="mt-0.5 leading-tight whitespace-pre-wrap">
							{lowerItem.description}
						</span>
					</div>
				) : (
					<div>(This rubric item was removed)</div>
				))}
		</div>
	);
}
