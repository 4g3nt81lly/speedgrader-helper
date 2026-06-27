import type { IRubric } from '@models/Rubric';
import { RubricItem, type IRubricItem } from '@models/RubricItem';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ReorderIcon from '@mui/icons-material/Reorder';
import {
	Button,
	Checkbox,
	FormControl,
	FormHelperText,
	FormLabel,
	IconButton,
	Input,
	Table,
	Textarea,
	Tooltip,
	Typography,
} from '@mui/joy';
import Constants from '@shared/constants';
import { isDecimalEqual, isDecimalGreaterThan, isDecimalPositive } from '@shared/utils';
import Decimal from 'decimal.js';
import { useState, type ChangeEvent, type SubmitEvent } from 'react';
import type { IQuestion } from '~/models/Question';
import type { Nullable } from '~/types/utils';

export type RubricTableProps = {
	rubric: IRubric;
	maxPoints: string;
	updateRubric(newRubric: IQuestion['rubric']): void;
};

export default function RubricTable(props: RubricTableProps) {
	const { rubric, maxPoints, updateRubric } = props;

	const addRubricItem = () => {
		updateRubric({
			...rubric,
			items: [
				...rubric.items,
				RubricItem.create({
					title: 'Untitled rubric item',
					description: 'This is a new rubric item.',
					points: '0',
				}),
			],
		});
	};

	const updateRubricItem = (newRubricItem: IRubricItem) => {
		const newItems = [...rubric.items];
		const index = newItems.findIndex((item) => item.id === newRubricItem.id);
		newItems[index] = newRubricItem;
		updateRubric({ ...rubric, items: newItems });
	};

	const removeRubricItem = (rubricItemId: string) => {
		updateRubric({
			...rubric,
			items: rubric.items.filter((item) => item.id !== rubricItemId),
		});
	};

	const toggleRubricGradingMode = (_event: ChangeEvent<HTMLInputElement>) => {
		updateRubric({
			...rubric,
			gradingMode: rubric.gradingMode === 'positive' ? 'negative' : 'positive',
		});
	};

	const removeRubric = () => {
		if (confirm('Remove rubric? This cannot be undone!')) {
			updateRubric(null);
		}
	};

	return (
		<div>
			<Table className="table-auto bg-transparent">
				<thead>
					<tr className="bg-transparent [&>th]:h-[20px] [&>th]:bg-transparent [&>th]:px-0">
						<th></th>
						<th>Description</th>
						<th className="text-center">Points</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{rubric.items.map((item) => (
						<RubricItemRow
							key={item.id}
							rubricItem={item}
							maxPoints={maxPoints}
							update={updateRubricItem}
							remove={removeRubricItem}
						/>
					))}
				</tbody>
				<tfoot>
					<tr className="bg-transparent [&>td]:bg-transparent">
						<td colSpan={4}>
							<div className="flex justify-between">
								<div className="flex items-center justify-start">
									<Tooltip title="New" size="sm" enterDelay={Constants.TOOLTIP_ENTER_DELAY}>
										<IconButton onClick={addRubricItem}>
											<AddIcon />
										</IconButton>
									</Tooltip>
									{/* <Tooltip title="Import" size="sm" enterDelay={Constants.TOOLTIP_ENTER_DELAY}>
									<IconButton>
										<UploadIcon />
									</IconButton>
								</Tooltip> */}
									<Tooltip
										title="Points will default to maximum"
										size="sm"
										enterDelay={Constants.TOOLTIP_ENTER_DELAY}
									>
										<Checkbox
											label="Negative grading"
											checked={rubric.gradingMode === 'negative'}
											size="sm"
											onChange={toggleRubricGradingMode}
											className="items-center px-2"
										/>
									</Tooltip>
								</div>

								<div className="flex justify-end">
									<Tooltip title="Remove All" size="sm" enterDelay={Constants.TOOLTIP_ENTER_DELAY}>
										<IconButton onClick={removeRubric}>
											<DeleteIcon htmlColor="firebrick" />
										</IconButton>
									</Tooltip>
								</div>
							</div>
						</td>
					</tr>
				</tfoot>
			</Table>
		</div>
	);
}

type RubricItemRowProps = {
	rubricItem: IRubricItem;
	maxPoints: string;
	update(newRubricItem: IRubricItem): void;
	remove(id: string): void;
};

function RubricItemRow({ rubricItem, maxPoints, update, remove }: RubricItemRowProps) {
	const [newDescription, setNewDescription] = useState(rubricItem.description);
	const [newPoints, setNewPoints] = useState(rubricItem.points);

	const [isEditing, setEditing] = useState(false);
	const [descriptionError, setDescriptionError] = useState<Nullable<string>>(null);

	const handleToggleEdit = () => {
		isEditing ? discardEdit() : setEditing(true);
	};

	const saveEdit = () => {
		if (!newDescription.trim()) {
			return setDescriptionError('Description cannot be empty');
		}
		update({
			...rubricItem,
			description: newDescription,
			points: Decimal(newPoints).toString(),
		});
		setEditing(false);
	};

	const discardEdit = () => {
		if (isDecimalEqual(newPoints, rubricItem.points) || confirm('Discard unsaved changes?')) {
			setEditing(false);
		}
	};

	const handleSetNewDescription = (event: ChangeEvent<HTMLTextAreaElement>) => {
		if (descriptionError !== null) {
			setDescriptionError(null);
		}
		setNewDescription(event.target.value);
	};

	const handleSetNewPoints = (event: ChangeEvent<HTMLInputElement>) => {
		const points = event.target.value;
		const numberPoints = Number(points);
		if (points === '-' || points === '.') {
			setNewPoints(points);
		} else if (!isFinite(numberPoints)) {
			// Invalid input, do not update state
			return;
		} else if (isDecimalEqual(numberPoints, 0)) {
			setNewPoints(points);
		} else if (!isDecimalGreaterThan(Decimal.abs(numberPoints), maxPoints)) {
			setNewPoints(points);
		}
	};

	const handleSubmitForm = (event: SubmitEvent) => {
		event.preventDefault();
		saveEdit();
	};

	const handleRemove = () => {
		if (confirm('Confirm: Remove rubric item? This cannot be undone.')) {
			remove(rubricItem.id);
			setEditing(false);
		}
	};

	return (
		<>
			<tr className="[&>td]:p-0">
				<td>
					<div className="mr-2 ml-1 text-center">
						<Tooltip title="Drag to reoder" size="sm" enterDelay={Constants.TOOLTIP_ENTER_DELAY}>
							<ReorderIcon className="align-middle" />
						</Tooltip>
					</div>
				</td>
				<td>
					<Typography level="body-sm" className="my-2 line-clamp-5 text-start leading-4.5">
						{rubricItem.description}
					</Typography>
				</td>
				<td>
					<Typography
						level="body-sm"
						fontWeight="bold"
						color={isDecimalPositive(rubricItem.points) ? 'success' : 'danger'}
						className="line-clamp-1 max-w-16 px-2 text-center text-ellipsis"
					>
						{isDecimalPositive(rubricItem.points) ? '+' : ''}
						{rubricItem.points}
					</Typography>
				</td>
				<td>
					<div className="text-center">
						<Tooltip
							title="Remove"
							size="sm"
							placement="left"
							enterDelay={Constants.TOOLTIP_ENTER_DELAY}
						>
							<IconButton size="sm" onClick={handleRemove}>
								<CloseIcon fontSize="small" />
							</IconButton>
						</Tooltip>
						<Tooltip
							title={isEditing ? 'Collapse' : 'Edit'}
							size="sm"
							placement="left"
							enterDelay={Constants.TOOLTIP_ENTER_DELAY}
						>
							<IconButton size="sm" onClick={handleToggleEdit}>
								{isEditing ? (
									<KeyboardArrowUpIcon fontSize="small" />
								) : (
									<EditIcon fontSize="small" />
								)}
							</IconButton>
						</Tooltip>
					</div>
				</td>
			</tr>

			{isEditing && (
				<tr>
					<td colSpan={4}>
						<form onSubmit={handleSubmitForm}>
							<div className="flex flex-col gap-2 p-4">
								<FormControl error={descriptionError !== null}>
									<Textarea
										placeholder="Description"
										value={newDescription}
										onChange={handleSetNewDescription}
										minRows={2}
										autoFocus
									/>
									{descriptionError !== null && (
										<FormHelperText>
											<InfoOutlinedIcon />
											{descriptionError}
										</FormHelperText>
									)}
								</FormControl>
								<FormControl>
									<FormLabel>Points</FormLabel>
									<Input value={newPoints} onChange={handleSetNewPoints} />
									<FormHelperText className="mt-2 mb-1 flex flex-col items-start leading-4.5">
										Enter the number of points this rubric item awards/deducts.
										<ul className="pl-4">
											<li>Use a negative number for deduction.</li>
											<li>
												The magnitude of this value must be no greater than {maxPoints} point(s).
											</li>
										</ul>
									</FormHelperText>
								</FormControl>

								<div className="flex justify-between">
									<Button variant="outlined" color="neutral" onClick={discardEdit}>
										Discard
									</Button>
									<Button onClick={saveEdit}>Save</Button>
								</div>
							</div>
						</form>
					</td>
				</tr>
			)}
		</>
	);
}
