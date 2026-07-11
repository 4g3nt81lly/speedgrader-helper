import type { IQuestion } from '#models/Question';
import type { IRubric } from '#models/Rubric';
import { type IRubricItem, RubricItem } from '#models/RubricItem';
import { inOutTransitionMotionProps } from '#shared/animation';
import Constants from '#shared/constants';
import {
	isDecimal,
	isDecimalEqual,
	isDecimalGreaterThan,
	isDecimalPositive,
} from '#shared/decimal';
import type { Nullable } from '#shared/types/utils';
import AddIcon from '@mui/icons-material/Add';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
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
	ButtonGroup,
	Checkbox,
	Dropdown,
	FormControl,
	FormHelperText,
	FormLabel,
	IconButton,
	Input,
	Menu,
	MenuButton,
	MenuItem,
	Textarea,
	Tooltip,
	Typography,
	useTheme,
} from '@mui/joy';
import Decimal from 'decimal.js';
import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react';
import { type ChangeEvent, type SubmitEvent, useEffect, useRef, useState } from 'react';

type RubricListEditorProps = {
	rubric: IRubric;
	maxPoints: string;
	updateRubric(newRubric: IQuestion['rubric']): void;
};

export default function RubricListEditor(props: RubricListEditorProps) {
	const { rubric, maxPoints, updateRubric } = props;

	const [draftItemId, setDraftItemId] = useState<Nullable<IRubricItem['id']>>(null);

	const [orderedRubricItems, setOrderedRubricItems] = useState<Nullable<IRubricItem[]>>(null);
	const orderedRubricItemsRef = useRef(orderedRubricItems);

	const isReordering = orderedRubricItems !== null;
	const rubricItems = orderedRubricItems ?? rubric.items;

	function addRubricItem() {
		const newItem = RubricItem.create({ description: 'This is a new rubric item.', points: '0' });
		updateRubric({ ...rubric, items: [...rubric.items, newItem] });
	}

	function addNoCreditRubricItem() {
		const newItem = RubricItem.create({
			description: 'Incorrect answer',
			points: rubric.gradingMode === 'positive' ? '0' : Decimal.sub(0, maxPoints).toString(),
		});
		updateRubric({ ...rubric, items: [...rubric.items, newItem] });
	}

	function addFullCreditRubricItem() {
		if (rubric.gradingMode === 'negative') return;
		const newItem = RubricItem.create({ description: 'Correct answer', points: maxPoints });
		updateRubric({ ...rubric, items: [...rubric.items, newItem] });
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

	function setTemporaryOrderedRubricItems(orderedRubricItems: Nullable<IRubricItem[]>) {
		setOrderedRubricItems(orderedRubricItems);
		orderedRubricItemsRef.current = orderedRubricItems;
	}

	function toggleReordering() {
		const reorderedItems = isReordering ? null : rubric.items;
		setTemporaryOrderedRubricItems(reorderedItems);
	}

	function updateOrderedRubricItems() {
		if (!isReordering) return;
		updateRubric({ ...rubric, items: orderedRubricItemsRef.current! });
	}

	function handleRemoveRubric() {
		if (!confirm('Remove rubric? This cannot be undone!')) return;
		updateRubric(null);
	}

	useEffect(() => {
		if (!isReordering) return;
		// In case rubric was modified elsewhere
		setTemporaryOrderedRubricItems(rubric.items);
	}, [rubric]);

	return (
		<motion.div className="mb-2 flex flex-col" layout="size">
			<Reorder.Group
				as="div"
				className="relative"
				values={rubricItems}
				onReorder={setTemporaryOrderedRubricItems}
			>
				<AnimatePresence mode="popLayout">
					{rubricItems.map((rubricItem) => (
						<RubricListItem
							key={rubricItem.id}
							rubricItem={rubricItem}
							maxPoints={maxPoints}
							reorderable={isReordering}
							confirmReorder={updateOrderedRubricItems}
							draftItemId={draftItemId}
							beginEdit={() => setDraftItemId(rubricItem.id)}
							endEdit={handleEndEditing}
							remove={handleRemoveRubricItem}
						/>
					))}
				</AnimatePresence>
			</Reorder.Group>

			<motion.div className="flex justify-between" layout="position">
				<div className="flex items-center justify-start gap-1">
					<ButtonGroup variant="plain" sx={{ '--ButtonGroup-separatorColor': 'none' }}>
						<Tooltip title="Add rubric item" enterDelay={Constants.TOOLTIP_ENTER_DELAY}>
							<IconButton variant="soft" size="sm" disabled={isReordering} onClick={addRubricItem}>
								<AddIcon />
							</IconButton>
						</Tooltip>
						<Dropdown>
							<Tooltip title="Rubric presets" enterDelay={Constants.TOOLTIP_ENTER_DELAY}>
								<MenuButton variant="soft" size="sm" className="rounded-r-md border-0 p-0">
									<ArrowDropDownIcon fontSize="small" />
								</MenuButton>
							</Tooltip>
							<Menu>
								<MenuItem
									onClick={addFullCreditRubricItem}
									disabled={rubric.gradingMode === 'negative'}
								>
									Full credit
								</MenuItem>
								<MenuItem onClick={addNoCreditRubricItem}>No credit</MenuItem>
							</Menu>
						</Dropdown>
					</ButtonGroup>
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
						title={isReordering ? 'Done reorder' : 'Reorder'}
						size="sm"
						enterDelay={Constants.TOOLTIP_ENTER_DELAY}
					>
						<IconButton
							disabled={!isReordering && rubric.items.length === 0}
							onClick={toggleReordering}
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
	beginEdit(): void;
	endEdit(newRubricItem: Nullable<IRubricItem>): void;
	remove(id: IRubricItem['id']): void;
};

function RubricListItem(props: RubricListItemProps) {
	const {
		rubricItem,
		maxPoints,
		reorderable,
		confirmReorder,
		draftItemId,
		beginEdit: beginEditing,
		endEdit: endEditing,
		remove,
	} = props;
	const isEditing = draftItemId === rubricItem.id;

	const theme = useTheme();
	const dragControls = useDragControls();

	const [draftItem, setDraftItem] = useState(rubricItem);
	const [descriptionError, setDescriptionError] = useState<Nullable<string>>(null);

	function handleToggleEdit() {
		isEditing ? discardEdit() : beginEditing();
	}

	function saveEdit() {
		if (!draftItem.description.trim()) {
			return setDescriptionError('Description cannot be empty');
		}
		const newPoints = Decimal(draftItem.points).toString();
		const newItem: IRubricItem = {
			...rubricItem,
			description: draftItem.description,
			points: newPoints,
		};
		endEditing(newItem);
		setDraftItem(newItem);
		setDescriptionError(null);
	}

	function discardEdit() {
		const unchanged =
			draftItem.description.trim() === rubricItem.description &&
			isDecimal(draftItem.points) &&
			isDecimalEqual(draftItem.points, rubricItem.points);
		if (unchanged || confirm('Discard unsaved changes?')) {
			endEditing(null);
			setDraftItem(rubricItem);
			setDescriptionError(null);
		}
	}

	function handleSetNewDescription(event: ChangeEvent<HTMLTextAreaElement>) {
		if (descriptionError !== null) {
			setDescriptionError(null);
		}
		setDraftItem({ ...draftItem, description: event.target.value });
	}

	function handleSetNewPoints(event: ChangeEvent<HTMLInputElement>) {
		const points = event.target.value;
		if (
			points === '-' ||
			points === '+' ||
			points === '.' ||
			(isDecimal(points) &&
				(isDecimalEqual(points, 0) || !isDecimalGreaterThan(Decimal.abs(points), maxPoints)))
		) {
			setDraftItem({ ...draftItem, points });
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
						<Typography
							level="body-sm"
							className="my-2 ml-2 line-clamp-5 text-start leading-4.5 whitespace-pre-wrap"
						>
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
										value={draftItem.description}
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
									<Input value={draftItem.points} onChange={handleSetNewPoints} />
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
