import type { IQuestion } from '~/models/Question';
import type { IQuiz } from '~/models/Quiz';
import { defaultAppSettings, type AppSettings } from '~/shared/settings';
import type { Nullable } from '~/types/utils';
import navigateSubmission from './navigate';
import { submitFeedback } from './submit';

export type GradingContext = {
	appSettings: AppSettings;

	quiz: Nullable<IQuiz>;
	lastGradedQuestionId: Nullable<IQuestion['id']>;

	submissionWindow: Nullable<Window>;
	submissionForm: Nullable<HTMLFormElement>;
	readonly dirtyQuestions: Set<IQuestion['id']>;
	isFeedbackSubmitting: boolean;

	readonly submitFeedback: (
		this: GradingContext,
		event?: SubmitEvent,
		navigate?: 'next' | 'prev'
	) => Promise<Nullable<boolean>>;
	readonly navigateSubmission: (
		this: GradingContext,
		direction: 'next' | 'prev',
		save?: boolean
	) => Promise<void>;
};

const gradingContext: GradingContext = {
	appSettings: defaultAppSettings,

	quiz: null,
	lastGradedQuestionId: null,

	submissionWindow: null,
	submissionForm: null,
	dirtyQuestions: new Set<IQuestion['id']>(),
	isFeedbackSubmitting: false,

	submitFeedback,
	navigateSubmission,
};

setExternalState(gradingContext, 'appSettings');
setExternalState(gradingContext, 'isFeedbackSubmitting');

export default gradingContext;

const listeners = new Map<keyof GradingContext, Set<() => void>>();

function setExternalState<T, K extends keyof T>(target: T, key: K) {
	let store = target[key];
	Object.defineProperty(target, key, {
		get() {
			return store;
		},
		set(newValue: T[K]) {
			store = newValue;
			notifyAll<T>(key);
		},
	});
}

export function subscribeToGradingContext(
	key: keyof GradingContext,
	listener: () => void
) {
	const keyListeners = listeners.get(key) ?? new Set();
	keyListeners.add(listener);
	listeners.set(key, keyListeners);
	return () => {
		keyListeners.delete(listener);
		if (keyListeners.size === 0) {
			listeners.delete(key);
		}
	};
}

function notifyAll<T>(target?: keyof T) {
	for (const [key, keyListeners] of listeners.entries()) {
		if (target && key !== target) continue;
		keyListeners.forEach((listener) => listener());
	}
}
