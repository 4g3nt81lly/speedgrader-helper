import { addContentEventListener, ContentEvent } from '#content/event';
import Patterns from '#shared/patterns';

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
}
