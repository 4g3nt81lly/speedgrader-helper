import { ContentCommand, ICommandMessage } from '~/shared/message';
import { quizLoaders } from './QuizLoader';

type MessageHandlers = {
	[C in ContentCommand]?: (message: ICommandMessage<C>) => any;
};

const messageHandlers: MessageHandlers = {
	[ContentCommand.loadQuiz](payload) {
		const { loader: loaderType, payload: loaderPayload } = payload;
		const quizLoader = new quizLoaders[loaderType]();
		const newQuiz = quizLoader.getQuiz(loaderPayload);
		return newQuiz;
	},
	[ContentCommand.injectQuiz]() {},
};

export default messageHandlers;
