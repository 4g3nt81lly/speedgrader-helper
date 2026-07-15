import {
	feedbackSubmissionStrategyDescriptions,
	feedbackSubmissionStrategyNames,
	quizInjectorNames,
	quizLoaderNames,
} from '#shared/modules';
import { AppHotKeySettings, AppSettings, defaultAppSettings } from '#shared/settings';
import QuizFeedbackLocalStore from '#shared/stores/QuizFeedbackLocalStore';
import DropdownMenu from '#sidepanel/components/DropdownMenu';
import HotkeysButton from '#sidepanel/components/HotkeysButton';
import { RubricEditorSelector } from '#sidepanel/components/RubricAccordion';
import useDebounce from '#sidepanel/pages/dashboard/hooks/useDebounce';
import { MainPageDispatch, useMainSelector } from '#sidepanel/pages/main/stores/main.store';
import { removeAllQuizzes } from '#sidepanel/pages/main/stores/quizzes.slice';
import { selectQuiz } from '#sidepanel/pages/main/stores/selection.slice';
import { updateAppSettings } from '#sidepanel/pages/main/stores/settings.slice';
import { Button, Input, Switch, Typography } from '@mui/joy';
import { type ChangeEvent, type ReactNode } from 'react';
import { useDispatch } from 'react-redux';

export default function SettingsPage() {
	const dispatch = useDispatch<MainPageDispatch>();
	const quizzes = useMainSelector('quizzes');
	const settings = useMainSelector('settings');

	function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
		dispatch(updateAppSettings({ [key]: value }));
	}

	const handleCanvasBaseURLChange = useDebounce((event: ChangeEvent<HTMLInputElement>) => {
		const newBaseURL = event.target.value || defaultAppSettings.canvasBaseURL;
		dispatch(updateAppSettings({ canvasBaseURL: newBaseURL }));
	});

	const handleCanvasAccessTokenChange = useDebounce((event: ChangeEvent<HTMLInputElement>) => {
		const newAccessToken = event.target.value || null;
		dispatch(updateAppSettings({ canvasAccessToken: newAccessToken }));
	});

	function setHotkeys<K extends keyof AppHotKeySettings>(key: K, value: AppHotKeySettings[K]) {
		setSetting('hotkeys', { ...settings.hotkeys, [key]: value });
	}

	function handleClearQuizzes() {
		if (!confirm('Remove all quizzes? This cannot be undone.')) return;
		dispatch(selectQuiz(null));
		dispatch(removeAllQuizzes());
	}

	function handleClearFeedback() {
		if (!confirm('Clear all feedback saved in local storage? This cannot be undone.')) return;
		Promise.allSettled(
			Object.keys(quizzes).map((quizId) => QuizFeedbackLocalStore.clearAllFeedback(quizId))
		);
	}

	function handleResetSettings() {
		if (!confirm('Reset all settings to default?')) return;
		dispatch(updateAppSettings(defaultAppSettings));
	}

	async function handleFactoryReset() {
		if (!confirm('Clear all local storage and reload extension? This cannot be undone.')) return;
		await chrome.storage.local.clear();
		chrome.runtime.reload();
	}

	return (
		<div className="mt-5 flex h-full flex-col overflow-y-scroll px-5">
			<div className="sticky top-0 z-100 bg-white pb-3">
				<Typography level="h3">Settings</Typography>
			</div>

			<div className="mb-18">
				<SettingsSection heading="Grading">
					<SettingItem
						title="Scroll to last-graded question"
						description="Automatically scroll to most-recently graded question after navigation."
					>
						<Switch
							checked={settings.scrollToLastGradedQuestion}
							onChange={(event) => setSetting('scrollToLastGradedQuestion', event.target.checked)}
						/>
					</SettingItem>
					<SettingItem
						title="Feedback submission strategy"
						description={
							feedbackSubmissionStrategyDescriptions[settings.feedbackSubmissionStrategy]
						}
						controlPosition="start"
					>
						<DropdownMenu
							items={feedbackSubmissionStrategyNames}
							selectedItem={settings.feedbackSubmissionStrategy}
							onSelect={setSetting.bind(null, 'feedbackSubmissionStrategy')}
						/>
					</SettingItem>
				</SettingsSection>

				<SettingsSection heading="Rubric">
					<SettingItem
						title="Default rubric editor"
						description="The preferred rubric editor when editing question rubric."
					>
						<RubricEditorSelector
							editorType={settings.defaultRubricEditor}
							setEditorType={setSetting.bind(null, 'defaultRubricEditor')}
						/>
					</SettingItem>
					<SettingItem
						title="Default grading mode"
						description="The default grading mode to use for new rubrics. The default is positive-grading."
					>
						<Typography level="body-sm" className="mr-2">
							{settings.defaultGradingMode === 'positive' ? 'Positive' : 'Negative'}
						</Typography>
						<Switch
							checked={settings.defaultGradingMode === 'positive'}
							onChange={(event) =>
								setSetting('defaultGradingMode', event.target.checked ? 'positive' : 'negative')
							}
						/>
					</SettingItem>
				</SettingsSection>

				<SettingsSection heading="Hotkeys">
					<SettingItem
						title="Submit feedback"
						description="Customize hotkeys to save grades and submit feedback."
					>
						<HotkeysButton
							hotkeys={settings.hotkeys.quizSubmitFeedback}
							defaultHotkeys={defaultAppSettings.hotkeys.quizSubmitFeedback}
							setHotkeys={setHotkeys.bind(null, 'quizSubmitFeedback')}
						/>
					</SettingItem>
					<SettingItem
						title="Next submission"
						description="Customize hotkeys to navigate to the next student submission."
					>
						<HotkeysButton
							hotkeys={settings.hotkeys.quizNextSubmission}
							defaultHotkeys={defaultAppSettings.hotkeys.quizNextSubmission}
							setHotkeys={setHotkeys.bind(null, 'quizNextSubmission')}
						/>
					</SettingItem>
					<SettingItem
						title="Previous submission"
						description="Customize hotkeys to navigate to the previous student submission."
					>
						<HotkeysButton
							hotkeys={settings.hotkeys.quizPrevSubmission}
							defaultHotkeys={defaultAppSettings.hotkeys.quizPrevSubmission}
							setHotkeys={setHotkeys.bind(null, 'quizPrevSubmission')}
						/>
					</SettingItem>
				</SettingsSection>

				<SettingsSection heading="Engine">
					<SettingItem
						title="Quiz Injector"
						description="The preferred method for injecting grading controls into SpeedGrader."
					>
						<DropdownMenu
							items={quizInjectorNames}
							selectedItem={settings.defaultQuizInjector}
							onSelect={setSetting.bind(null, 'defaultQuizInjector')}
						/>
					</SettingItem>
					<SettingItem
						title="Quiz Loader"
						description="The preferred method for loading Canvas quiz."
					>
						<DropdownMenu
							items={quizLoaderNames}
							selectedItem={settings.defaultQuizLoader}
							onSelect={setSetting.bind(null, 'defaultQuizLoader')}
						/>
					</SettingItem>
				</SettingsSection>

				<SettingsSection heading="Integrations">
					<SettingItem title="Canvas Domain" description="Base URL of the Canvas domain.">
						<Input
							type="url"
							size="sm"
							defaultValue={settings.canvasBaseURL}
							onChange={handleCanvasBaseURLChange}
						/>
					</SettingItem>
					<SettingItem title="Canvas Access Token" description="Access Token for Canvas Open API.">
						<Input
							type="password"
							size="sm"
							className="w-50"
							defaultValue={settings.canvasAccessToken ?? ''}
							onChange={handleCanvasAccessTokenChange}
						/>
					</SettingItem>
				</SettingsSection>

				<SettingsSection heading="Danger zone">
					<SettingItem
						title="Clear quizzes"
						description="Remove all quizzes and their rubrics and saved feedbacks from the local storage."
					>
						<Button variant="soft" size="sm" color="danger" onClick={handleClearQuizzes}>
							Clear quizzes
						</Button>
					</SettingItem>
					<SettingItem
						title="Clear saved feedback"
						description="Clear grading feedback saved in local storage."
					>
						<Button variant="soft" size="sm" color="danger" onClick={handleClearFeedback}>
							Clear feedback
						</Button>
					</SettingItem>
					<SettingItem title="Restore settings">
						<Button variant="soft" size="sm" color="danger" onClick={handleResetSettings}>
							Reset settings
						</Button>
					</SettingItem>
					<SettingItem
						title="Factory reset"
						description="Clear local storage and reload the extension."
					>
						<Button variant="soft" size="sm" color="danger" onClick={handleFactoryReset}>
							Factory reset
						</Button>
					</SettingItem>
				</SettingsSection>
			</div>
		</div>
	);
}

type SettingSectionProps = {
	heading: string;
	children?: ReactNode | ReactNode[];
};

function SettingsSection({ heading, children }: SettingSectionProps) {
	return (
		<div className="mb-3 flex flex-col">
			<div className="sticky top-10 bg-white pb-2">
				<Typography level="title-md" fontWeight="bold">
					{heading}
				</Typography>
			</div>
			<SettingItemSeparator />
			<div className="mt-3 flex flex-col gap-4">{children}</div>
		</div>
	);
}

type SettingItemProps = {
	title: string;
	description?: string;
	controlPosition?: 'start' | 'center';
	children: ReactNode;
};

function SettingItem(props: SettingItemProps) {
	const { title, description, controlPosition, children } = props;

	return (
		<div className="flex justify-between gap-5">
			<div className="flex shrink flex-col justify-center gap-1">
				<Typography level="title-sm" fontWeight={600}>
					{title}
				</Typography>
				{description && (
					<Typography level="body-xs" className="leading-4">
						{description}
					</Typography>
				)}
			</div>

			<div
				className={`my-1 flex shrink-0 ${controlPosition === 'start' ? 'items-start' : 'items-center'}`}
			>
				{children}
			</div>
		</div>
	);
}

function SettingItemSeparator() {
	return <hr className="my-0 w-full border-[0.5px] border-gray-200" />;
}
