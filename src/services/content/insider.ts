import { addContentEventListener, ContentEvent } from '~/shared/event';
import Patterns from '~/shared/patterns';
import Selectors from './selectors';

interface SpeedGraderWindow extends Window {
	INST?: {
		refreshGrades(): void;
	};
}

if (
	(import.meta.env.DEV || Patterns.SG_URL_ORIGIN.test(window.location.origin)) &&
	Patterns.SG_URL_PATHNAME.test(window.location.pathname)
) {
	addContentEventListener(ContentEvent.refreshGrades, () => {
		const inst = (<SpeedGraderWindow>window).INST;
		if (inst) {
			inst.refreshGrades();
		} else {
			console.error('Failed to refresh grades: window.INST not found');
		}
	});

	addContentEventListener(ContentEvent.navigateSubmission, ({ direction }) => {
		const navigationButton = <HTMLButtonElement>(
			window.document.querySelector(
				direction === 'prev'
					? Selectors.oldSpeedGrader.PREV_STUDENT_BUTTON
					: Selectors.oldSpeedGrader.NEXT_STUDENT_BUTTON
			)
		);
		if (navigationButton) {
			navigationButton.click();
		} else {
			console.error('Submission navigation button not found');
		}
	});
}
