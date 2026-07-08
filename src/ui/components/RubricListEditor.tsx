import type { IQuestion } from '#models/Question';
import type { IRubric } from '#models/Rubric';
import { type IRubricItem, RubricItem } from '#models/RubricItem';
import { inOutTransitionMotionProps } from '#shared/animation';
import Constants from '#shared/constants';
import { isDecimalEqual, isDecimalGreaterThan, isDecimalPositive } from '#shared/decimal';
import type { Nullable } from '#shared/types/utils';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import DoneIcon from '@mui/icons-material/Done';
import EditIcon from '@mui/icons-material/Edit';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import ReorderIcon from '@mui/icons-material/Reorder';
import {
	Button,
	Checkbox,
	FormControl,
	FormHelperText,
	FormLabel,
	IconButton,
	Input,
	Textarea,
	Tooltip,
	Typography,
	useTheme,
} from '@mui/joy';
import Decimal from 'decimal.js';
import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react';
import { type ChangeEvent, type SubmitEvent, useRef, useState } from 'react';

type RubricListEditorProps = {
	rubric: IRubric;
	maxPoints: string;
	updateRubric(newRubric: IQuestion['rubric']): void;
};

export default function RubricListEditor(props: RubricListEditorProps) {
	const { rubric, maxPoints, updateRubric: _updateRubric } = props;

	const [draftItemId, setDraftItemId] = useState<Nullable<IRubricItem['id']>>(null);

	const [isReordering, setIsReordering] = useState(false);
	const [orderedRubricItems, setOrderedRubricItems] = useState(rubric.items);
	const orderedRubricItemsRef = useRef(orderedRubricItems);

	function updateRubric(newRubric: IQuestion['rubric']) {
		_updateRubric(newRubric);

		const temporaryOrderedRubricItems = newRubric?.items ?? [];
		setOrderedRubricItems(temporaryOrderedRubricItems);
		orderedRubricItemsRef.current = temporaryOrderedRubricItems;
	}

	function addRubricItem() {
		updateRubric({
			...rubric,
			items: [
				...rubric.items,
				RubricItem.create({ description: 'This is a new rubric item.', points: '0' }),
			],
		});
	}

	function toggleRubricGradingMode(_event: ChangeEvent<HTMLInputElement>) {
		updateRubric({
			...rubric,
			gradingMode: rubric.gradingMode === 'positive' ? 'negative' : 'positive',
		});
	}

	function handleEndEditing(newRubricItem: Nullable<IRubricItem>) {
		if (newRubricItem) {
			const newItems = [...rubric.items];
			const index = newItems.findIndex((item) => item.id === newRubricItem.id);
			newItems[index] = newRubricItem;
			updateRubric({ ...rubric, items: newItems });
		}
		setDraftItemId(null);
	}

	function handleRemoveRubricItem(rubricItemId: string) {
		if (draftItemId === rubricItemId) {
			setDraftItemId(null);
		}
		updateRubric({
			...rubric,
			items: rubric.items.filter((item) => item.id !== rubricItemId),
		});
	}

	function handleRemoveRubric() {
		if (!confirm('Remove rubric? This cannot be undone!')) return;
		updateRubric(null);
	}

	function setTemporaryOrderedRubricItems(orderedRubricItems: IRubricItem[]) {
		setOrderedRubricItems(orderedRubricItems);
		orderedRubricItemsRef.current = orderedRubricItems;
	}

	function updateOrderedRubricItems() {
		_updateRubric({ ...rubric, items: orderedRubricItemsRef.current });
	}

	return (
		<motion.div className="mb-2 flex flex-col" layout="size">
			<Reorder.Group
				as="div"
				className="relative"
				values={orderedRubricItems}
				onReorder={setTemporaryOrderedRubricItems}
			>
				<AnimatePresence mode="popLayout">
					{orderedRubricItems.map((rubricItem) => (
						<RubricListItem
							key={rubricItem.id}
							rubricItem={rubricItem}
							maxPoints={maxPoints}
							reorderable={isReordering}
							confirmReorder={updateOrderedRubricItems}
							draftItemId={draftItemId}
							beginEditing={() => setDraftItemId(rubricItem.id)}
							endEditing={handleEndEditing}
							remove={handleRemoveRubricItem}
						/>
					))}
				</AnimatePresence>
			</Reorder.Group>

			<motion.div className="flex justify-between" layout="position">
				<div className="flex items-center justify-start">
					<Tooltip title="New" size="sm" enterDelay={Constants.TOOLTIP_ENTER_DELAY}>
						<IconButton disabled={isReordering} onClick={addRubricItem}>
							<AddIcon />
						</IconButton>
					</Tooltip>
					<Tooltip
						title="Points will default to maximum"
						size="sm"
						enterDelay={Constants.TOOLTIP_ENTER_DELAY}
					>
						<Checkbox
							label="Negative grading"
							checked={rubric.gradingMode === 'negative'}
							size="sm"
							disabled={isReordering}
							onChange={toggleRubricGradingMode}
							className="items-center px-2"
						/>
					</Tooltip>
				</div>

				<div className="flex">
					<Tooltip
						title={isReordering ? 'Done' : 'Reorder'}
						size="sm"
						enterDelay={Constants.TOOLTIP_ENTER_DELAY}
					>
						<IconButton
							disabled={!isReordering && rubric.items.length === 0}
							onClick={() => setIsReordering(!isReordering)}
						>
							{isReordering ? <DoneIcon /> : <MenuOpenIcon />}
						</IconButton>
					</Tooltip>
					<Tooltip title="Remove All" size="sm" enterDelay={Constants.TOOLTIP_ENTER_DELAY}>
						<IconButton color="danger" disabled={isReordering} onClick={handleRemoveRubric}>
							<DeleteIcon />
						</IconButton>
					</Tooltip>
				</div>
			</motion.div>
		</motion.div>
	);
}

type RubricListItemProps = {
	rubricItem: IRubricItem;
	maxPoints: string;

	reorderable: boolean;
	confirmReorder(): void;

	draftItemId: Nullable<IRubricItem['id']>;
	beginEditing(): void;
	endEditing(newRubricItem: Nullable<IRubricItem>): void;
	remove(id: IRubricItem['id']): void;
};

function RubricListItem(props: RubricListItemProps) {
	const {
		rubricItem,
		maxPoints,
		reorderable,
		confirmReorder,
		draftItemId,
		beginEditing,
		endEditing,
		remove,
	} = props;
	const isEditing = draftItemId === rubricItem.id;

	const theme = useTheme();
	const dragControls = useDragControls();

	const [newDescription, setNewDescription] = useState(rubricItem.description);
	const [newPoints, setNewPoints] = useState(rubricItem.points);
	const [descriptionError, setDescriptionError] = useState<Nullable<string>>(null);

	function handleToggleEdit() {
		isEditing ? discardEdit() : beginEditing();
	}

	function resetTemporaryStates() {
		setNewDescription(rubricItem.description);
		setNewPoints(rubricItem.points);
		setDescriptionError(null);
	}

	function saveEdit() {
		if (!newDescription.trim()) {
			return setDescriptionError('Description cannot be empty');
		}
		endEditing({
			...rubricItem,
			description: newDescription,
			points: Decimal(newPoints).toString(),
		});
		resetTemporaryStates();
	}

	function discardEdit() {
		if (
			(newDescription.trim() === rubricItem.description &&
				isDecimalEqual(newPoints, rubricItem.points)) ||
			confirm('Discard unsaved changes?')
		) {
			endEditing(null);
			resetTemporaryStates();
		}
	}

	function handleSetNewDescription(event: ChangeEvent<HTMLTextAreaElement>) {
		if (descriptionError !== null) {
			setDescriptionError(null);
		}
		setNewDescription(event.target.value);
	}

	function handleSetNewPoints(event: ChangeEvent<HTMLInputElement>) {
		const points = event.target.value;
		const numberPoints = Number(points);
		if (points === '-' || points === '.') {
			setNewPoints(points);
		} else if (!isFinite(numberPoints)) {
			// Invalid input, do not update state
		} else if (
			isDecimalEqual(numberPoints, 0) ||
			!isDecimalGreaterThan(Decimal.abs(numberPoints), maxPoints)
		) {
			setNewPoints(points);
		}
	}

	function handleSubmitForm(event: SubmitEvent) {
		event.preventDefault();
		saveEdit();
	}

	function handleRemove() {
		if (!confirm('Confirm: Remove rubric item? This cannot be undone.')) return;
		remove(rubricItem.id);
	}

	return (
		<Reorder.Item
			key={rubricItem.id}
			as="div"
			className="my-3"
			value={rubricItem}
			dragListener={false}
			dragControls={dragControls}
			onDragEnd={confirmReorder}
			{...inOutTransitionMotionProps({ opacity: [0, 1] })}
		>
			<motion.div
				className="relative flex flex-col px-2 py-1.5"
				style={{
					backgroundColor: theme.vars.palette.background.surface,
					boxShadow: '0 1px 6px 0 rgba(0, 0, 0, 0.25)',
					borderRadius: 10,
				}}
				layout
			>
				<motion.div className="flex justify-between" layout="position">
					<div className="flex">
						<AnimatePresence mode="popLayout">
							{reorderable && (
								<motion.div
									className="ml-1 flex cursor-ns-resize items-center"
									onPointerDown={(event) => dragControls.start(event, { snapToCursor: true })}
									{...inOutTransitionMotionProps({ opacity: [0, 1] })}
								>
									<ReorderIcon />
								</motion.div>
							)}
						</AnimatePresence>
						<Typography level="body-sm" className="my-2 ml-2 line-clamp-5 text-start leading-4.5">
							{rubricItem.description}
						</Typography>
					</div>

					<div className="flex items-center">
						<Typography
							level="body-sm"
							fontWeight="bold"
							color={isDecimalPositive(rubricItem.points) ? 'success' : 'danger'}
							className="line-clamp-1 max-w-16 px-2 text-center text-ellipsis"
						>
							{isDecimalPositive(rubricItem.points) ? '+' : ''}
							{rubricItem.points}
						</Typography>

						<Tooltip
							title={isEditing ? 'Collapse' : 'Edit'}
							size="sm"
							placement="left"
							enterDelay={Constants.TOOLTIP_ENTER_DELAY}
						>
							<IconButton
								size="sm"
								disabled={(draftItemId !== null && !isEditing) || reorderable}
								onClick={handleToggleEdit}
							>
								{isEditing ? (
									<KeyboardArrowUpIcon fontSize="small" />
								) : (
									<EditIcon fontSize="small" />
								)}
							</IconButton>
						</Tooltip>
						<Tooltip
							title="Remove"
							size="sm"
							placement="left"
							enterDelay={Constants.TOOLTIP_ENTER_DELAY}
						>
							<IconButton size="sm" disabled={reorderable} onClick={handleRemove}>
								<CloseIcon fontSize="small" />
							</IconButton>
						</Tooltip>
					</div>
				</motion.div>

				<AnimatePresence mode="popLayout">
					{isEditing && (
						<motion.form
							onSubmit={handleSubmitForm}
							layout="position"
							{...inOutTransitionMotionProps({ opacity: [0, 1] })}
						>
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
									<FormHelperText className="mt-2 mb-2 flex flex-col items-start leading-4.5">
										Enter the number of points this rubric item awards/deducts.
										<ul className="my-0 pl-4">
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
						</motion.form>
					)}
				</AnimatePresence>
			</motion.div>
		</Reorder.Item>
	);
}
