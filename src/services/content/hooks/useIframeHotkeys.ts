import actions from '#content/actions';
import type { AppHotkeySettings } from '#shared/settings';
import { useHotkeys } from '#shared/utils/browser/hooks';

export default function useIframeHotkeys(
	hotkeys: AppHotkeySettings,
	iframeDocument: Document
) {
	const contextActions = actions.gradingContext;

	useHotkeys(
		hotkeys.quizSubmitFeedback,
		() => contextActions.submitAndSaveFeedback({ verboseNoOp: true }),
		{
			document: iframeDocument,
			debounceSeconds: 1,
			enableOnFormTags: ['textarea'],
		}
	);

	useHotkeys(
		hotkeys.quizNextSubmission,
		() => contextActions.submitFeedbackAndNavigate('next'),
		{
			document: iframeDocument,
			debounceSeconds: 0.5,
			enableOnFormTags: ['textarea'],
		}
	);

	useHotkeys(
		hotkeys.quizPrevSubmission,
		() => contextActions.submitFeedbackAndNavigate('prev'),
		{
			document: iframeDocument,
			debounceSeconds: 0.5,
			enableOnFormTags: ['textarea'],
		}
	);
}
