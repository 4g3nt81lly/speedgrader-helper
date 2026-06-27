const Constants = {
	/* Local storage */

	LOCAL_STORE_QUEUE_NAME: 'localStorage.queue',
	STORE_QUIZZES_KEY: 'quizzes' as const,

	/* Events + Messaging channels */

	REFRESH_GRADES_EVENT_NAME: 'refreshGrades',
	SIDEPANEL_CHANNEL: 'sidepanel',

	/* UI */

	TOOLTIP_ENTER_DELAY: 750,

	/* Miscellaneous */

	SECOND_MS: 1000,
	RECEIVING_END_DNE_MESSAGE: 'Receiving end does not exist.',
};

export default Constants;
