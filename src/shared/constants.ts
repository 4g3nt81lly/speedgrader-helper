const Constants = {
	/* Local storage */

	QUIZ_ACTION_QUEUE_NAME: 'quizzes.queue',
	APP_SETTINGS_ACTION_QUEUE_NAME: 'appSettings.queue',
	STORE_QUIZZES_KEY: 'quizzes' as const,
	STORE_APP_SETTINGS_KEY: 'settings' as const,

	/* Events + Messaging channels */

	REFRESH_GRADES_EVENT_NAME: 'refreshGrades',
	SIDEPANEL_CHANNEL: 'sidepanel',

	/* UI */

	TOOLTIP_ENTER_DELAY: 1000,

	/* Miscellaneous */

	SECOND_MS: 1000,
	HOTKEYS_DELIMITER: '+',
	RECEIVING_END_DNE_MESSAGE: 'Receiving end does not exist.',
};

export default Constants;
