import CanvasAPI from '#models/CanvasAPI';
import { useMainAppSettings } from '#pages/main/stores/main.store';
import type { CanvasCourse } from '#schemas/CanvasCourse.schema';
import type { CanvasQuiz } from '#schemas/CanvasQuiz.schema';
import Constants from '#shared/constants';
import Patterns from '#shared/patterns';
import type { QuizLoaderPayload, QuizLoaderPayloadMap } from '#shared/types/loader';
import type { Nullable } from '#shared/types/utils';
import { useDebounce } from '#shared/utils/browser/hooks';
import ReplayIcon from '@mui/icons-material/Replay';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
	Autocomplete,
	AutocompleteOption,
	FormControl,
	FormLabel,
	IconButton,
	ListItemContent,
	Tooltip,
	Typography,
} from '@mui/joy';
import { useRef, useState, type SyntheticEvent } from 'react';

type CanvasAPIOptionsProps = {
	setOptions(options: Nullable<Pick<QuizLoaderPayloadMap['canvasAPI'], 'payload'>>): void;
};

export default function CanvasAPILoaderConfig(props: CanvasAPIOptionsProps) {
	const { setOptions } = props;

	const appSettings = useMainAppSettings();

	const [coursesState, setCoursesState] = useState<CoursesState>({
		options: null,
		selected: null,
		isLoading: false,
		loadError: null,
	});
	const [quizzesState, setQuizzesState] = useState<QuizzesState>({
		courseId: null,
		options: null,
		selected: null,
		isLoading: false,
		loadError: null,
	});

	const { current: options } = useRef<QuizLoaderPayload['canvasAPI']>({ courseId: '', quizId: '' });

	function updateOptions() {
		const { courseId, quizId } = options;
		if (Patterns.CANVAS_COURSE_ID.test(courseId) && Patterns.CANVAS_QUIZ_ID.test(quizId)) {
			setOptions({ payload: { courseId, quizId } });
		} else {
			setOptions(null);
		}
	}

	function updateCoursesState(coursesState: CoursesState) {
		setCoursesState(coursesState);
		options.courseId = coursesState.selected?.id ?? '';
		if (!coursesState.selected) {
			setQuizzesState({
				courseId: null,
				options: null,
				selected: null,
				isLoading: false,
				loadError: null,
			});
		}
		updateOptions();
	}

	function updateQuizzesState(quizzesState: QuizzesState) {
		setQuizzesState(quizzesState);
		options.quizId = quizzesState.selected?.id ?? '';
		updateOptions();
	}

	function handleCourseSelection(_event: SyntheticEvent, option: Nullable<CanvasCourse>) {
		if (coursesState.isLoading || !coursesState.options) return;
		updateCoursesState({ ...coursesState, selected: option });
	}

	function handleQuizSelection(_event: SyntheticEvent, option: Nullable<CanvasQuiz>) {
		if (quizzesState.isLoading || !quizzesState.options) return;
		updateQuizzesState({ ...quizzesState, selected: option });
	}

	const loadCourses = useDebounce(async (force: boolean = false) => {
		if (coursesState.isLoading) return;
		if (!force && coursesState.options) return;

		if (!appSettings.canvasAccessToken) {
			return updateCoursesState({ ...coursesState, loadError: 'Missing Canvas API access token.' });
		}
		updateCoursesState({ ...coursesState, isLoading: true, loadError: null });
		const canvasAPI = new CanvasAPI(appSettings.canvasBaseURL, appSettings.canvasAccessToken);
		try {
			var courses = await canvasAPI.getCourses();
		} catch (error) {
			return updateCoursesState({
				...coursesState,
				isLoading: false,
				loadError:
					error instanceof Error
						? error.message
						: 'An unknown error occurred while loading Canvas courses.',
			});
		}
		updateCoursesState({ options: courses, selected: null, isLoading: false, loadError: null });
	}, 1 * Constants.SECOND_MS);

	const loadQuizzes = useDebounce(async (force: boolean = false) => {
		const courseId = options.courseId;
		if (coursesState.isLoading || quizzesState.isLoading || !courseId) return;
		if (!force && courseId === quizzesState.courseId) return;

		if (!appSettings.canvasAccessToken) {
			return setQuizzesState({ ...quizzesState, loadError: 'Missing Canvas API access token.' });
		}
		updateQuizzesState({ ...quizzesState, isLoading: true, loadError: null });
		const canvasAPI = new CanvasAPI(appSettings.canvasBaseURL, appSettings.canvasAccessToken);
		try {
			var quizzes = await canvasAPI.getQuizzes(courseId);
		} catch (error) {
			return updateQuizzesState({
				...quizzesState,
				isLoading: false,
				loadError:
					error instanceof Error
						? error.message
						: `An unknown error occurred while loading quizzes from Canvas course ID ${options.courseId}.`,
			});
		}
		updateQuizzesState({
			courseId,
			options: quizzes,
			selected: null,
			isLoading: false,
			loadError: null,
		});
	}, 1 * Constants.SECOND_MS);

	return (
		<div className="flex flex-col gap-3">
			<FormControl>
				<FormLabel>Canvas Course ID</FormLabel>
				<div className="flex gap-1">
					<Autocomplete
						placeholder="Course ID"
						options={coursesState.options ?? []}
						value={coursesState.selected}
						onChange={handleCourseSelection}
						onFocus={() => loadCourses()}
						loading={coursesState.isLoading}
						loadingText="Loading Canvas courses..."
						readOnly={quizzesState.isLoading}
						isOptionEqualToValue={(lhs, rhs) => lhs.id === rhs.id}
						getOptionLabel={(option) => option.id}
						renderOption={(props, option) => (
							<AutocompleteOption {...props} key={option.id}>
								<ListItemContent>
									{option.name}
									<Typography level="body-xs">
										ID: {option.id}, {option.course_code}
									</Typography>
								</ListItemContent>
							</AutocompleteOption>
						)}
						className="w-full"
					/>
					<Tooltip title="Reload Canvas courses" enterDelay={Constants.TOOLTIP_ENTER_DELAY}>
						<IconButton
							size="sm"
							onClick={() => loadCourses(true)}
							disabled={coursesState.isLoading || quizzesState.isLoading}
						>
							<ReplayIcon fontSize="small" />
						</IconButton>
					</Tooltip>
				</div>
			</FormControl>
			{coursesState.loadError && (
				<div className="flex gap-1">
					<WarningAmberIcon color="error" />
					<Typography level="body-sm" color="danger">
						{coursesState.loadError}
					</Typography>
				</div>
			)}
			<FormControl>
				<FormLabel>Canvas Quiz ID</FormLabel>
				<div className="flex gap-1">
					<Autocomplete
						placeholder="Quiz ID"
						options={quizzesState.options ?? []}
						value={quizzesState.selected}
						onChange={handleQuizSelection}
						onFocus={() => loadQuizzes()}
						loading={quizzesState.isLoading}
						loadingText="Loading Canvas quizzes..."
						readOnly={coursesState.selected === null}
						isOptionEqualToValue={(lhs, rhs) => lhs.id === rhs.id}
						getOptionLabel={(option) => option.id}
						renderOption={(props, option) => (
							<AutocompleteOption {...props} key={option.id}>
								<ListItemContent>
									{option.title} ({option.id})
									{option.description && (
										<Typography level="body-xs">{option.description}</Typography>
									)}
								</ListItemContent>
							</AutocompleteOption>
						)}
						className="w-full"
					/>
					<Tooltip title="Reload Canvas quizzes" enterDelay={Constants.TOOLTIP_ENTER_DELAY}>
						<IconButton
							size="sm"
							onClick={() => loadQuizzes(true)}
							disabled={coursesState.isLoading || quizzesState.isLoading || !coursesState.selected}
						>
							<ReplayIcon fontSize="small" />
						</IconButton>
					</Tooltip>
				</div>
			</FormControl>
		</div>
	);
}

type CoursesState =
	| {
			// 1) Not loaded or 2) attempted to load but failed
			options: null;
			selected: null;
			isLoading: false;
			loadError: Nullable<string>;
	  }
	| {
			// Loading for the first time
			options: null;
			selected: null;
			isLoading: true;
			loadError: null;
	  }
	| {
			// Either 1) successfully loaded or 2) failed with an error but has cache
			options: CanvasCourse[];
			selected: Nullable<CanvasCourse>;
			isLoading: false;
			loadError: Nullable<string>;
	  }
	| {
			// Loading and has cache
			options: CanvasCourse[];
			selected: Nullable<CanvasCourse>;
			isLoading: true;
			loadError: null;
	  };

type QuizzesState =
	| {
			// 1) Not loaded or 2) attempted to load but failed
			courseId: null;
			options: null;
			selected: null;
			isLoading: false;
			loadError: Nullable<string>;
	  }
	| {
			// Loading for the first time
			courseId: null;
			options: null;
			selected: null;
			isLoading: true;
			loadError: null;
	  }
	| {
			// Either 1) successfully loaded or 2) failed with an error but has cache
			courseId: string;
			options: CanvasQuiz[];
			selected: Nullable<CanvasQuiz>;
			isLoading: false;
			loadError: Nullable<string>;
	  }
	| {
			// Loading and has cache
			courseId: string;
			options: CanvasQuiz[];
			selected: Nullable<CanvasQuiz>;
			isLoading: true;
			loadError: null;
	  };
