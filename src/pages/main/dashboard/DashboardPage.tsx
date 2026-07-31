import { useMainQuizzes, useMainSelection } from '#pages/main/stores/main.store';
import { addQuiz } from '#pages/main/stores/quizzes.actions';
import { selectQuiz } from '#pages/main/stores/selection.actions';
import Constants from '#shared/constants';
import AddIcon from '@mui/icons-material/Add';
import UploadIcon from '@mui/icons-material/Upload';
import { Button, IconButton, TabPanel, Tabs, Tooltip, Typography } from '@mui/joy';
import { useState } from 'react';
import QuizCreationView from './CreateQuiz/QuizCreationView';
import QuizDetailsView from './QuizDetailsView';
import QuizListView from './QuizListView';
import useQuizIO from './hooks/useQuizIO';

const enum DashboardTab {
	QuizList = 1,
	QuizDetails = 2,
	QuizCreation = 3,
}

export default function DashboardPage() {
	const quizzes = useMainQuizzes();
	const selectedQuizId = useMainSelection().quiz;

	const quizIO = useQuizIO();

	const [isCreatingNewQuiz, setIsCreatingNewQuiz] = useState(false);

	const selectedQuiz = selectedQuizId ? (quizzes[selectedQuizId] ?? null) : null;

	const currentView = isCreatingNewQuiz
		? DashboardTab.QuizCreation
		: selectedQuiz === null
			? DashboardTab.QuizList
			: DashboardTab.QuizDetails;

	async function handleImportQuiz() {
		const newQuiz = await quizIO.importQuiz();
		if (!newQuiz) return;
		addQuiz(newQuiz);
		selectQuiz(newQuiz.id);
	}

	return (
		<Tabs className="h-full overflow-hidden bg-transparent" value={currentView}>
			<TabPanel value={DashboardTab.QuizList} keepMounted className="overflow-hidden p-0">
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

			<TabPanel value={DashboardTab.QuizDetails} className="overflow-hidden p-0">
				{selectedQuiz && <QuizDetailsView quiz={selectedQuiz} />}
			</TabPanel>

			<TabPanel value={DashboardTab.QuizCreation} className="overflow-hidden p-0">
				<QuizCreationView dismiss={() => setIsCreatingNewQuiz(false)} />
			</TabPanel>
		</Tabs>
	);
}
