import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import type { ChangeEvent } from 'react';
import { isDecimalPositive } from '~/shared/utils';
import {
	DiffDescriptor,
	type DiffRubricItem,
	type IQuestionGradingState,
} from './QuestionGradingState';

export type RubricControlsProps = {
	gradingState: IQuestionGradingState;
	canGrade: boolean;

	checkRubricItemCanToggle(rubricItem: DiffRubricItem): boolean;
	toggleRubricItemSelection(rubricItem: DiffRubricItem): void;
	handleCommentsChange(event: ChangeEvent<HTMLTextAreaElement>): void;
};

export default function RubricControls(props: RubricControlsProps) {
	const {
		gradingState,
		canGrade,
		checkRubricItemCanToggle,
		toggleRubricItemSelection,
		handleCommentsChange,
	} = props;

	return (
		<div className="flex flex-col gap-3">
			{gradingState.rubricItems.length > 0 && (
				<div className="flex flex-col gap-1">
					{gradingState.rubricItems.map((rubricItem) => {
						return (
							<RubricItemControls
								key={rubricItem.id}
								rubricItem={rubricItem}
								isSelected={!!gradingState.selectedRubricItems?.[rubricItem.id]}
								canToggle={canGrade && checkRubricItemCanToggle(rubricItem)}
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
					value={gradingState.comments}
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
	const showDiff = status === DiffDescriptor.modified || status === DiffDescriptor.removed;

	return (
		<div className="flex flex-col">
			<label className="flex cursor-pointer items-center gap-1">
				<input type="checkbox" checked={isSelected} disabled={!canToggle} onChange={toggleSelect} />
				<span
					style={{
						color: isDecimalPositive(upperItem.points) ? 'green' : 'red',
						fontWeight: 'bold',
					}}
				>
					({isDecimalPositive(upperItem.points) ? '+' : ''}
					{upperItem.points})
				</span>
				<span>{upperItem.description}</span>
			</label>
			{showDiff &&
				(lowerItem ? (
					<div className="ml-7 flex items-center gap-1">
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
						<span>{lowerItem.description}</span>
					</div>
				) : (
					<div>(This rubric item was removed)</div>
				))}
		</div>
	);
}
