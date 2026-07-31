import DropdownMenu from '#pages/components/DropdownMenu';
import useCreateQuiz from '#pages/main/dashboard/hooks/useCreateQuiz';
import QuestionListView from '#pages/main/dashboard/QuestionListView';
import { quizLoaderNames } from '#pages/settings/descriptions';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ReplayIcon from '@mui/icons-material/Replay';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Button, CircularProgress, Divider, IconButton, Tooltip, Typography } from '@mui/joy';
import CanvasAPILoaderConfig from './CanvasAPILoaderConfig';

type QuizCreationViewProps = {
	dismiss(): void;
};

export default function QuizCreationView(props: QuizCreationViewProps) {
	const { dismiss } = props;

	const {
		state,
		totalPoints,
		quizLoader,
		quizLoaderOptions,
		setQuizLoader,
		setQuizLoaderOptions,
		loadQuiz,
		confirmQuiz,
		reset,
	} = useCreateQuiz(dismiss);

	return (
		<div className="flex h-full flex-col justify-between">
			<div>
				<Button
					variant="plain"
					startDecorator={<ChevronLeftIcon fontSize="small" />}
					size="sm"
					className="mt-1 ml-2 pl-1.5"
					disabled={state.isLoading}
					onClick={dismiss}
				>
					Back
				</Button>

				<div className="mx-5 mt-2 pb-2.5">
					<Typography
						level="h3"
						className={`line-clamp-1 text-ellipsis ${state.newQuiz ? 'scale-[70%]' : 'scale-100'} origin-left transition-transform`}
					>
						Create New Quiz
					</Typography>
					{state.newQuiz && (
						<>
							<Typography level="h3" className="line-clamp-1 text-ellipsis">
								{state.newQuiz.title}
							</Typography>
							<Typography level="body-sm" className="mt-1">
								{state.newQuiz.questions.length} Questions, {totalPoints.toString()} total points
							</Typography>
						</>
					)}
				</div>
			</div>

			{state.isLoading ? (
				<div className="flex grow flex-col items-center justify-center gap-3">
					<CircularProgress />
					<Typography className="text-center">Loading Canvas quiz...</Typography>
				</div>
			) : state.newQuiz ? (
				<div className="overflow-y-scroll">
					<QuestionListView questions={state.newQuiz.questions} cardOptions={{ readonly: true }} />
				</div>
			) : (
				<div className="mx-5 flex grow flex-col gap-4">
					<div className="grid grid-cols-[auto_fit-content(16rem)] gap-x-4 gap-y-3">
						<Typography level="title-md" className="self-center">
							Quiz Loader
						</Typography>
						<DropdownMenu
							items={quizLoaderNames}
							selectedItem={quizLoader}
							onSelect={setQuizLoader}
						/>
					</div>
					<Divider />
					{quizLoader === 'canvasAPI' && (
						<CanvasAPILoaderConfig setOptions={setQuizLoaderOptions} />
					)}
				</div>
			)}

			<div className="flex flex-col gap-3 px-5 pt-4 pb-6">
				{state.isOverwrite && (
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
				{state.errorMessage !== null && (
					<Typography
						level="body-sm"
						color="danger"
						startDecorator={<WarningAmberIcon fontSize="small" />}
						className="flex gap-0.5 leading-tight"
					>
						{state.errorMessage}
					</Typography>
				)}
				<div className="flex justify-between gap-3">
					<div className="flex gap-2">
						<Button variant="outlined" disabled={!state.newQuiz} onClick={reset}>
							Discard
						</Button>
						<Tooltip title="Reload">
							<IconButton disabled={!state.newQuiz} onClick={loadQuiz}>
								<ReplayIcon />
							</IconButton>
						</Tooltip>
					</div>

					{state.newQuiz ? (
						<Button variant="solid" onClick={confirmQuiz}>
							Create
						</Button>
					) : (
						<Button
							variant="solid"
							disabled={state.isLoading || quizLoaderOptions === null}
							onClick={loadQuiz}
						>
							{state.isLoading ? 'Loading...' : 'Load'}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
