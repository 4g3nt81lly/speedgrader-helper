const DECIMAL = /[+-]?(?:\d+(?:\.\d*)?|\.\d+)/;
const CANVAS_ID = /^\d+$/;

const Patterns = {
	DECIMAL,
	DECIMAL_STRING: new RegExp(`^${DECIMAL.source}$`),

	DSL: {
		RUBRIC_ITEM: new RegExp(
			String.raw`(?<=\n|^)[\t ]*(?:(?<index>\d+)\.[\t ]*)?(?:\([\t ]*(?<points>${DECIMAL.source})[\t ]*\)[\t ]*)(?<description>(?:[^\n]+\\[\t ]*\n)*[^\n]+)(?:\n|$)`,
			'gs'
		),
	},

	SG_URL_ORIGIN: /^https:\/\/canvas\.[a-z]+\.c(?:a|om)$/,
	SG_URL_PATHNAME: /^\/courses\/(?<courseId>\d+)\/gradebook\/speed_grader$/,
	SG_QUESTION_ID: /^question_\d+$/,

	CANVAS_COURSE_ID: CANVAS_ID,
	CANVAS_QUIZ_ID: CANVAS_ID,
	CANVAS_QUIZ_QUESTION_ID: CANVAS_ID,
};

export default Patterns;
