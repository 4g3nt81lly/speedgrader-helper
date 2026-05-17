import AddIcon from '@mui/icons-material/Add';
import AirIcon from '@mui/icons-material/Air';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
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
import type { MouseEvent } from 'react';
import { useDispatch } from 'react-redux';
import type { IQuiz } from '~/models/Quiz';
import Quiz from '~/models/Quiz';
import Constants from '~/shared/constants';
import { useMainSelector, type MainPageDispatch } from '../main/stores/main.store';
import { removeQuizzes } from '../main/stores/quizzes.slice';
import { selectQuiz } from '../main/stores/selection.slice';

export type QuizListViewProps = {};

export default function QuizListView(props: QuizListViewProps) {
	const dispatch = useDispatch<MainPageDispatch>();
	const quizzesMap = useMainSelector('quizzes');

	const quizzes = Object.values(quizzesMap);

	const handleRemoveQuiz = (event: MouseEvent<HTMLDivElement>, quiz: IQuiz) => {
		event.stopPropagation();
		if (confirm(getRemoveQuizPrompt(quiz))) {
			dispatch(removeQuizzes(quiz.id));
		}
	};

	const handleOpenInNewTab = (event: MouseEvent<HTMLAnchorElement>, quiz: IQuiz) => {
		event.stopPropagation();
		chrome.tabs.create({ url: quiz.url });
	};

	const handleExportQuiz = (event: MouseEvent<HTMLDivElement>, quiz: IQuiz) => {
		event.stopPropagation();
		chrome.downloads.download({
			url: Quiz.getExportedObjectURL(quiz),
			filename: `${quiz.title}.json`,
			saveAs: true,
		});
	};

	return quizzes.length > 0 ? (
		<List className="p-0">
			{quizzes.map((quiz) => (
				<ListItem
					key={quiz.id}
					className="p-0"
					sx={{ ':hover': { bgcolor: 'background.surface' } }}
				>
					<ListItemButton
						className="flex flex-col items-start gap-0 rounded-xl bg-transparent pt-2 pb-3"
						onClick={() => dispatch(selectQuiz(quiz.id))}
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
										<MenuItem onClick={(event) => handleRemoveQuiz(event, quiz)}>Remove</MenuItem>
										<MenuItem onClick={(event) => handleExportQuiz(event, quiz)}>Export</MenuItem>
									</Menu>
								</Dropdown>
							</div>
						</div>
						<Typography level="body-sm">{getQuizSummaryText(quiz)}</Typography>
						<Typography
							level="body-xs"
							className="mt-0.5 line-clamp-2 leading-4 wrap-anywhere text-ellipsis"
						>
							{quiz.url}
						</Typography>
					</ListItemButton>
				</ListItem>
			))}
		</List>
	) : (
		<div className="mb-10 flex flex-1 flex-col items-center justify-center gap-3">
			<AirIcon className="text-6xl" />
			<Typography level="body-lg">Nothing here yet!</Typography>
			<Typography>
				Click on <AddIcon fontSize="small" className="align-text-bottom" /> to add a new quiz!
			</Typography>
		</div>
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
	return `${quiz.questions.length} Questions, ${nonEmptyRubricCount} has rubric${quiz.focusMode && inFocusQuestionCount > 0 ? `, ${inFocusQuestionCount} in focus` : ''}`;
};

const getRemoveQuizPrompt = (quiz: IQuiz) => {
	return `Remove quiz "${quiz.title}"? This will not affect the submitted feedback but will remove all associated data. This cannot be undone!`;
};
