import DropdownMenu from '@components/DropdownMenu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Button, CircularProgress, Typography } from '@mui/joy';
import { quizLoaders, type QuizLoaderType } from '@services/content/QuizLoader';
import Decimal from 'decimal.js';
import { useEffect, useMemo } from 'react';
import QuestionListView from './QuestionListView';
import useCreateQuiz from './hooks/useCreateQuiz';

export type QuizCreationViewProps = {
	dismiss(): void;
};

export default function QuizCreationView(props: QuizCreationViewProps) {
	const { dismiss } = props;

	const {
		newQuiz,
		quizLoader,
		isLoading,
		isOverwrite,
		errorMessage,
		setQuizLoader,
		loadQuiz,
		confirmQuiz,
	} = useCreateQuiz(dismiss);

	const totalPoints = useMemo(() => {
		return newQuiz?.questions.reduce(
			(total, question) => Decimal.add(total, question.points).toString(),
			'0'
		);
	}, [newQuiz]);

	useEffect(loadQuiz, []);

	return (
		<div className="flex h-full flex-col overflow-y-scroll">
			<div className="sticky top-0 z-100 bg-white">
				<Button
					variant="plain"
					startDecorator={<ChevronLeftIcon fontSize="small" />}
					size="sm"
					className="mt-1 ml-2 pl-1.5"
					onClick={dismiss}
				>
					Back
				</Button>

				<div className="mx-5 mt-2 pb-2.5">
					<Typography
						level="h3"
						className={`line-clamp-1 text-ellipsis ${newQuiz ? 'scale-[70%]' : 'scale-100'} origin-left transition-transform`}
					>
						Create New Quiz
					</Typography>
					{newQuiz && (
						<>
							<Typography level="h3" className="line-clamp-1 text-ellipsis">
								{newQuiz.title}
							</Typography>
							<Typography level="body-sm" className="mt-1">
								{newQuiz.questions.length} Questions, {totalPoints} total points
							</Typography>
						</>
					)}
				</div>
			</div>

			{isLoading ? (
				<div className="mx-15 mb-20 flex flex-1 flex-col items-center justify-center gap-3">
					<CircularProgress />
					<Typography className="text-center">Detecting Canvas quiz from SpeedGrader...</Typography>
				</div>
			) : newQuiz ? (
				<div className="mb-5">
					<QuestionListView questions={newQuiz.questions} cardOptions={{ readonly: true }} />
					<ActionBar
						quizLoader={quizLoader}
						isOverwrite={isOverwrite}
						setQuizLoader={setQuizLoader}
						discardQuiz={dismiss}
						confirmQuiz={confirmQuiz}
					/>
				</div>
			) : (
				<div className="mb-24 flex flex-1 flex-col items-center justify-center text-center">
					<SearchOffIcon className="m-3 text-6xl" />
					<Typography className="mx-15">
						Unable to fetch Canvas quiz from SpeedGrader. Please try again.
					</Typography>
					<Typography level="body-sm" className="mx-15 my-3">
						Error message: {errorMessage}
					</Typography>

					<div className="mb-3 flex items-center gap-2">
						<Typography>Try another quiz loader:</Typography>
						<DropdownMenu
							items={quizLoaders}
							selectedItem={quizLoader}
							onSelect={setQuizLoader}
							render={(_quizLoaderId, quizLoaderClass) => quizLoaderClass.name}
						/>
					</div>

					<Button variant="plain" startDecorator={<RefreshIcon />} onClick={loadQuiz}>
						Reload
					</Button>
				</div>
			)}
		</div>
	);
}

type ActionBarProps = {
	quizLoader: QuizLoaderType;
	isOverwrite: boolean;
	setQuizLoader(quizLoader: QuizLoaderType): void;
	discardQuiz(): void;
	confirmQuiz(): void;
};

function ActionBar(props: ActionBarProps) {
	const { quizLoader, isOverwrite, setQuizLoader, discardQuiz, confirmQuiz } = props;

	return (
		<div className="absolute inset-x-0 bottom-0 z-100 flex flex-col gap-3 bg-white px-5 pt-5 pb-7">
			{isOverwrite && (
				<Typography
					level="body-sm"
					color="warning"
					startDecorator={<WarningAmberIcon fontSize="small" />}
					className="-mt-2 flex gap-0.5"
				>
					<span className="line-clamp-1 text-ellipsis">
						A quiz with this URL exists and will be overwritten.
					</span>
				</Typography>
			)}
			<div className="flex w-full justify-between gap-3">
				<Button variant="outlined" onClick={discardQuiz}>
					Discard
				</Button>
				<div className="flex gap-0.5">
					<DropdownMenu
						items={quizLoaders}
						selectedItem={quizLoader}
						onSelect={setQuizLoader}
						render={(_quizLoaderId, quizLoaderClass) => quizLoaderClass.name}
					/>
				</div>
				<Button variant="solid" onClick={confirmQuiz}>
					Create
				</Button>
			</div>
		</div>
	);
}
