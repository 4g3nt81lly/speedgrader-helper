import { ContentCommand, ICommandMessage } from '#shared/message';
import { defaultAppSettings } from '#shared/settings';
import AppSettingsLocalStore from '#shared/stores/AppSettingsLocalStore';
import gradingContext from './GradingContext';
import { quizLoaders } from './modules';
import { postSnackbarItem } from './ui/snackbar';

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

	async [ContentCommand.reloadAppSettings]() {
		try {
			var appSettings = await AppSettingsLocalStore.getAll();
		} catch (error) {
			return postSnackbarItem({
				message:
					'An error occurred while reloading app settings, please refresh the page.',
				closeReason: 'manual',
			});
		}
		gradingContext.appSettings = { ...defaultAppSettings, ...appSettings };
	},
};

export default messageHandlers;
