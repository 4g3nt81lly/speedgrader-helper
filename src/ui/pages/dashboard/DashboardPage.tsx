import AddIcon from '@mui/icons-material/Add';

import { Button, TabPanel, Tabs, Typography } from '@mui/joy';
import { useState } from 'react';
import { useMainSelector } from '../main/stores/main.store';
import QuizCreationView from './QuizCreationView';
import QuizDetailsView from './QuizDetailsView';
import QuizListView from './QuizListView';

const enum DashboardTab {
	QuizList = 1,
	QuizDetails = 2,
	QuizCreation = 3,
}

export default function DashboardPage() {
	const { quiz: selectedQuizId } = useMainSelector('selection');

	const [isCreatingNewQuiz, setIsCreatingNewQuiz] = useState(false);

	const currentView = isCreatingNewQuiz
		? DashboardTab.QuizCreation
		: selectedQuizId !== null
			? DashboardTab.QuizDetails
			: DashboardTab.QuizList;

	return (
		<Tabs className="h-full overflow-hidden bg-transparent" value={currentView}>
			<TabPanel value={DashboardTab.QuizList} keepMounted className="p-0">
				<div className="flex h-full flex-col px-5">
					<div className="mt-5 mb-2 flex justify-between">
						<Typography level="h3">Dashboard</Typography>

						<div className="flex">
							<Button
								size="sm"
								startDecorator={<AddIcon fontSize="small" />}
								className="ml-2"
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
				<QuizDetailsView />
			</TabPanel>

			<TabPanel value={DashboardTab.QuizCreation} className="overflow-hidden p-0">
				<QuizCreationView dismiss={() => setIsCreatingNewQuiz(false)} />
			</TabPanel>
		</Tabs>
	);
}
