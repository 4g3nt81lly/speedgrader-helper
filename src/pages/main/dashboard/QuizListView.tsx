import { type IQuiz } from '#models/Quiz';
import { useMainQuizzes } from '#pages/main/stores/main.store';
import { removeQuizzes, updateQuiz } from '#pages/main/stores/quizzes.actions';
import { selectQuiz } from '#pages/main/stores/selection.actions';
import Constants from '#shared/constants';
import AddIcon from '@mui/icons-material/Add';
import AirIcon from '@mui/icons-material/Air';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
	Chip,
	Dropdown,
	IconButton,
	List,
	ListItem,
	ListItemButton,
	Menu,
	MenuButton,
	MenuItem,
	Tooltip,
	Typography,
} from '@mui/joy';
import { useMemo, type MouseEvent } from 'react';
import useQuizIO from './hooks/useQuizIO';

type QuizListViewProps = {};

export default function QuizListView(props: QuizListViewProps) {
	const quizzesMap = useMainQuizzes();

	const quizIO = useQuizIO();

	const quizzes = useMemo(() => Object.values(quizzesMap), [quizzesMap]);

	function handleOpenInNewTab(event: MouseEvent<HTMLAnchorElement>, quiz: IQuiz) {
		event.stopPropagation();
		chrome.tabs.create({ url: quiz.url });
	}

	function handleToggleQuizEnabled(event: MouseEvent<HTMLDivElement>, quiz: IQuiz) {
		event.stopPropagation();
		if (confirm(`${quiz.isEnabled ? 'Disable' : 'Enable'} helper for "${quiz.title}"?`)) {
			updateQuiz({ id: quiz.id, isEnabled: !quiz.isEnabled }, true);
		}
	}

	function handleRemoveQuiz(event: MouseEvent<HTMLDivElement>, quiz: IQuiz) {
		event.stopPropagation();
		if (confirm(getRemoveQuizPrompt(quiz))) {
			removeQuizzes(quiz.id);
		}
	}

	function handleExportQuiz(event: MouseEvent<HTMLDivElement>, quiz: IQuiz) {
		event.stopPropagation();
		quizIO.exportQuiz(quiz);
	}

	if (quizzes.length === 0) {
		return (
			<div className="mb-5 flex h-full flex-col items-center justify-center gap-3">
				<AirIcon className="text-6xl" />
				<Typography level="body-lg">Nothing here yet!</Typography>
				<Typography>
					Click on <AddIcon fontSize="small" className="align-text-bottom" /> to add a new quiz!
				</Typography>
			</div>
		);
	}

	return (
		<List className="overflow-y-scroll p-0">
			{quizzes.map((quiz) => (
				<ListItem
					key={quiz.id}
					className="px-5"
					sx={{ ':hover': { bgcolor: 'background.surface' } }}
				>
					<ListItemButton
						className="flex flex-col items-start gap-0 rounded-xl bg-transparent pt-1 pb-3"
						onClick={() => selectQuiz(quiz.id)}
					>
						<div className="flex w-full items-center justify-between gap-2">
							<Typography level="title-md" fontWeight="bold" className="line-clamp-1 text-ellipsis">
								{quiz.title}
							</Typography>
							<div className="flex">
								<Tooltip
									title="Open SpeedGrader in New Tab"
									placement="bottom-end"
									enterDelay={Constants.TOOLTIP_ENTER_DELAY}
								>
									<IconButton size="sm" onClick={(event) => handleOpenInNewTab(event, quiz)}>
										<OpenInNewIcon fontSize="small" />
									</IconButton>
								</Tooltip>
								<Dropdown>
									<MenuButton
										slots={{ root: IconButton }}
										slotProps={{ root: { color: 'neutral', size: 'sm' } }}
										onClick={(event) => event.stopPropagation()}
									>
										<MoreHorizIcon fontSize="small" />
									</MenuButton>
									<Menu>
										<MenuItem onClick={(event) => handleToggleQuizEnabled(event, quiz)}>
											{quiz.isEnabled ? 'Disable' : 'Enable'}
										</MenuItem>
										<MenuItem onClick={(event) => handleRemoveQuiz(event, quiz)}>Remove</MenuItem>
										<MenuItem onClick={(event) => handleExportQuiz(event, quiz)}>Export</MenuItem>
									</Menu>
								</Dropdown>
							</div>
						</div>
						<div className="flex items-center gap-1.5">
							{!quiz.isEnabled && <Chip>Disabled</Chip>}
							<Typography level="body-sm">{getQuizSummaryText(quiz)}</Typography>
						</div>
						<Typography
							level="body-xs"
							className="mt-0.5 line-clamp-2 leading-4 wrap-anywhere text-ellipsis"
						>
							{quiz.url}
						</Typography>
					</ListItemButton>
				</ListItem>
			))}
			<li className="h-12" />
		</List>
	);
}

const getQuizSummaryText = (quiz: IQuiz) => {
	let nonEmptyRubricCount = 0;
	let inFocusQuestionCount = 0;
	for (const question of quiz.questions) {
		if (question.rubric && question.rubric.items.length > 0) {
			nonEmptyRubricCount++;
		}
		if (question.isFocused) {
			inFocusQuestionCount++;
		}
	}
	return `${quiz.questions.length} questions, ${nonEmptyRubricCount} has rubric${quiz.focusMode && inFocusQuestionCount > 0 ? `, ${inFocusQuestionCount} in focus` : ''}`;
};

const getRemoveQuizPrompt = (quiz: IQuiz) => {
	return `Remove quiz "${quiz.title}"? This will not affect the submitted feedback but will remove all associated data. This cannot be undone!`;
};
