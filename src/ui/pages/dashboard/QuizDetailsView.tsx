import type { IQuestion } from '#models/Question';
import Quiz, { type IQuiz } from '#models/Quiz';
import Constants from '#shared/constants';
import { ContentCommand, sendMessageToTab } from '#shared/message';
import { MainPageDispatch, useMainSelector } from '#sidepanel/pages/main/stores/main.store';
import { setQuiz } from '#sidepanel/pages/main/stores/quizzes.slice';
import { saveSelectionStateToLocalStorage } from '#sidepanel/pages/main/stores/selection.actions';
import { selectQuiz } from '#sidepanel/pages/main/stores/selection.slice';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import { Button, Checkbox, CircularProgress, IconButton, Tooltip, Typography } from '@mui/joy';
import { useEffect, useState, useTransition } from 'react';
import { useDispatch } from 'react-redux';
import QuestionListView from './QuestionListView';
import useQuizIO from './hooks/useQuizIO';

type QuizDetailsViewProps = {};

export default function QuizDetailsView(props: QuizDetailsViewProps) {
	const dispatch = useDispatch<MainPageDispatch>();
	const quizzes = useMainSelector('quizzes');

	const { quiz: selectedQuizId } = useMainSelector('selection');

	const [showQuestions, setShowQuestions] = useState(false);
	const [_isPending, startTransition] = useTransition();

	const quiz = quizzes[selectedQuizId!]!;

	function navigateBack() {
		dispatch(selectQuiz(null));
		dispatch(saveSelectionStateToLocalStorage());
	}

	function updateQuestion(newQuestion: IQuestion) {
		const newQuiz = Quiz.updateQuestion(quiz, newQuestion.id, (oldQuestion) => {
			if (quiz.isEnabled && quiz.focusMode && oldQuestion.isFocused !== newQuestion.isFocused) {
				sendMessageToTab({
					command: ContentCommand.updateFocusState,
					focusMode: 'select',
					target: { [newQuestion.id]: newQuestion.isFocused },
				});
			}
			return newQuestion;
		});
		dispatch(setQuiz({ quiz: newQuiz }));
		if (quiz.isEnabled) {
			sendMessageToTab({ command: ContentCommand.reloadRubric, question: newQuestion });
		}
	}

	useEffect(() => {
		startTransition(() => setShowQuestions(true));
	}, []);

	return (
		<div className="flex h-full flex-col overflow-y-scroll">
			<div className="sticky top-0 z-100 bg-white">
				<Button
					variant="plain"
					startDecorator={<ChevronLeftIcon fontSize="small" />}
					size="sm"
					className="mt-1 ml-2 pl-1.5"
					onClick={navigateBack}
				>
					Back
				</Button>

				<Typography level="h3" className="mx-5 mt-2 line-clamp-1 pb-3 text-ellipsis">
					{quiz.title}
				</Typography>
			</div>

			{showQuestions ? (
				<QuestionListView
					questions={quiz.questions}
					cardOptions={{ focusMode: quiz.focusMode, updateQuestion }}
				/>
			) : (
				<div className="mb-10 flex flex-1 flex-col items-center justify-center">
					<CircularProgress />
				</div>
			)}

			<ActionBar quiz={quiz} />
		</div>
	);
}

type ActionBarProps = {
	quiz: IQuiz;
};

const enum FocusState {
	none = 0,
	some = 1,
	all = 2,
}

function ActionBar({ quiz }: ActionBarProps) {
	const dispatch = useDispatch<MainPageDispatch>();

	const quizIO = useQuizIO();

	const focusedCount = quiz.questions.reduce((count, question) => {
		return question.isFocused ? count + 1 : count;
	}, 0);

	// None: -1; Some: 0, All: 1
	const focusState =
		focusedCount === quiz.questions.length
			? FocusState.all
			: focusedCount === 0
				? FocusState.none
				: FocusState.some;

	async function handleImportQuiz() {
		const newQuiz = await quizIO.importQuiz(quiz);
		if (!newQuiz) return;
		dispatch(setQuiz({ quiz: newQuiz, reload: true }));
	}

	function toggleFocusAllQuestions() {
		const newFocusMode = focusState <= FocusState.some;
		dispatch(
			setQuiz({
				quiz: Quiz.updateQuestions(quiz, (question) => ({ ...question, isFocused: newFocusMode })),
			})
		);
		if (quiz.isEnabled && quiz.focusMode) {
			sendMessageToTab({
				command: ContentCommand.updateFocusState,
				focusMode: 'select',
				target: newFocusMode ? 'all' : 'none',
			});
		}
	}

	function toggleFocusMode() {
		const newFocusMode = !quiz.focusMode;
		dispatch(setQuiz({ quiz: { ...quiz, focusMode: newFocusMode } }));

		if (!quiz.isEnabled) return;
		if (newFocusMode) {
			sendMessageToTab({
				command: ContentCommand.updateFocusState,
				focusMode: 'on',
				target: Object.fromEntries(
					quiz.questions.flatMap((question) => (question.isFocused ? [[question.id, true]] : []))
				),
			});
		} else {
			sendMessageToTab({
				command: ContentCommand.updateFocusState,
				focusMode: 'off',
				target: null,
			});
		}
	}

	return (
		<div className="absolute inset-x-0 bottom-0 z-100 flex items-center justify-between bg-white px-3 pt-3 pb-5">
			<Tooltip
				title={
					quiz.focusMode ? `Select ${focusState <= FocusState.some ? 'all' : 'none'} to focus` : ''
				}
				placement="right"
				enterDelay={Constants.TOOLTIP_ENTER_DELAY}
			>
				<Checkbox
					checked={focusState === FocusState.all}
					disabled={!quiz.focusMode}
					onChange={toggleFocusAllQuestions}
					indeterminate={focusState === FocusState.some}
					size="lg"
				/>
			</Tooltip>
			<div className="flex gap-2">
				<div className="flex">
					<Tooltip title="Import rubric" enterDelay={Constants.TOOLTIP_ENTER_DELAY}>
						<IconButton onClick={handleImportQuiz}>
							<UploadIcon />
						</IconButton>
					</Tooltip>
					<Tooltip title="Export rubric" enterDelay={Constants.TOOLTIP_ENTER_DELAY}>
						<IconButton onClick={() => quizIO.exportQuiz(quiz)}>
							<DownloadIcon />
						</IconButton>
					</Tooltip>
				</div>
				<Tooltip
					title={`Click to turn ${quiz.focusMode ? 'off' : 'on'} focus mode`}
					placement="top"
				>
					<Button variant={quiz.focusMode ? 'solid' : 'outlined'} onClick={toggleFocusMode}>
						Focus: {quiz.focusMode ? 'On' : 'Off'}
					</Button>
				</Tooltip>
			</div>
		</div>
	);
}
