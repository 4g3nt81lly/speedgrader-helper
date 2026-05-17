const Patterns = {
	SG_URL_ORIGIN: /^https:\/\/canvas\.[a-z]+\.c(?:a|om)$/,
	SG_URL_PATHNAME: /^\/courses\/(?<courseId>\d+)\/gradebook\/speed_grader$/,
};

export default Patterns;
