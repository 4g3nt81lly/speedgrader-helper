import actions from '#content/actions';
import type { NavigateSubmissionDirection } from '#content/helpers/navigateSubmission';
import { store } from '#content/stores';
import type { AppHotkeySettings } from '#shared/settings';
import { useHotkeys } from '#shared/utils/browser/hooks';

export default function useToplevelHotkeys(hotkeys: AppHotkeySettings) {
	const hasGradingContext = store.useStore((state) => state.gradingContext !== null);
	const contextActions = actions.gradingContext;

	useHotkeys(
		hotkeys.quizSubmitFeedback,
		() => contextActions.submitAndSaveFeedback({ verboseNoOp: true }),
		{
			debounceSeconds: 1,
			enabled: () => hasGradingContext,
		}
	);

	useHotkeys(hotkeys.quizNextSubmission, handleNavigateSubmission.bind(null, 'next'), {
		debounceSeconds: 0.5,
		callbackDeps: [hasGradingContext],
	});

	useHotkeys(hotkeys.quizPrevSubmission, handleNavigateSubmission.bind(null, 'prev'), {
		debounceSeconds: 0.5,
		callbackDeps: [hasGradingContext],
	});

	function handleNavigateSubmission(direction: NavigateSubmissionDirection) {
		if (hasGradingContext) {
			contextActions.submitFeedbackAndNavigate(direction);
		} else {
			contextActions.navigateSubmission(direction);
		}
	}
}
