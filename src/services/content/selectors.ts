const oldSpeedGrader = {
	SUBMISSION_IFRAME_HOLDER: '#iframe_holder',
	SUBMISSION_IFRAME: 'iframe#speedgrader_iframe',
	GRADER_HEADER: 'nav#gradebook_header_container',
	PREV_STUDENT_BUTTON: '#prev-student-button',
	NEXT_STUDENT_BUTTON: '#next-student-button',
	SUBMISSION_FORM: 'form#update_history_form',
	QUESTION_LIST: '#questions',
	QUESTION_CONTAINER: '.question_holder[aria-label="Question"] .display_question',
	QUESTION_HEADER: '.header',
	QUESTION_POINTS_HOLDER: '.question_points_holder',
	QUESTION_HIDDEN_POINTS_INPUT: 'input.question_input_hidden[type="hidden"]',
	QUESTION_POINTS_INPUT: 'input.question_input',
	QUESTION_MAX_POINTS: '.points.question_points',
	QUESTION_TEXT: '.text',
	QUESTION_TYPE: '.question_type',
	QUESTION_COMMENTS_TEXTAREA: '.quiz_comment textarea',
};

const newSpeedGrader = {
	...oldSpeedGrader,
	SUBMISSION_IFRAME: 'iframe#submission-preview-iframe',
	GRADER_HEADER: '#top-menu',
};

const Selectors = {
	oldSpeedGrader,
	newSpeedGrader,

	app: {
		GRADING_BOX_CLASS: 'sgh_grading_box_host',
		HIDDEN_QUESTION_CLASS: 'sgh_question_hidden',
	},
};

export default Selectors;
