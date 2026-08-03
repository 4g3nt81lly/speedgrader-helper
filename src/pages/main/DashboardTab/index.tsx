import Constants from '#pages/constants';
import actions from '#pages/main/actions';
import { mainPageState } from '#pages/main/stores';
import AddIcon from '@mui/icons-material/Add';
import UploadIcon from '@mui/icons-material/Upload';
import { Button, IconButton, TabPanel, Tabs, Tooltip, Typography } from '@mui/joy';
import { useState } from 'react';
import QuizCreationView from './CreateQuiz/QuizCreationView';
import QuizDetailsView from './QuizDetailsView';
import QuizListView from './QuizListView';
import useQuizIO from './hooks/useQuizIO';

const enum Tab {
	QuizList = 1,
	QuizDetails = 2,
	QuizCreation = 3,
}

export default function DashboardTab() {
	const quizzes = mainPageState.useStore('quizzes');
	const selectedQuizId = mainPageState.useStore('selection').quiz;

	const quizIO = useQuizIO();

	const [isCreatingNewQuiz, setIsCreatingNewQuiz] = useState(false);

	const selectedQuiz = selectedQuizId ? (quizzes[selectedQuizId] ?? null) : null;

	const currentView = isCreatingNewQuiz
		? Tab.QuizCreation
		: selectedQuiz === null
			? Tab.QuizList
			: Tab.QuizDetails;

	async function handleImportQuiz() {
		const newQuiz = await quizIO.importQuiz();
		if (!newQuiz) return;

		actions.addQuiz(newQuiz);
		actions.selection.selectQuiz(newQuiz.id);
	}

	return (
		<Tabs className="h-full overflow-hidden bg-transparent" value={currentView}>
			<TabPanel value={Tab.QuizList} keepMounted className="overflow-hidden p-0">
				<div className="flex h-full flex-col">
					<div className="mx-5 mt-5 mb-2 flex justify-between">
						<Typography level="h3">Dashboard</Typography>

						<div className="flex gap-3">
							<Tooltip title="Import a quiz" enterDelay={Constants.TOOLTIP_ENTER_DELAY}>
								<IconButton size="sm" onClick={handleImportQuiz}>
									<UploadIcon />
								</IconButton>
							</Tooltip>
							<Button
								size="sm"
								startDecorator={<AddIcon fontSize="small" />}
								onClick={() => setIsCreatingNewQuiz(true)}
							>
								New
							</Button>
						</div>
					</div>

					<QuizListView />
				</div>
			</TabPanel>

			<TabPanel value={Tab.QuizDetails} className="overflow-hidden p-0">
				{selectedQuiz && <QuizDetailsView quiz={selectedQuiz} />}
			</TabPanel>

			<TabPanel value={Tab.QuizCreation} className="overflow-hidden p-0">
				<QuizCreationView dismiss={() => setIsCreatingNewQuiz(false)} />
			</TabPanel>
		</Tabs>
	);
}
