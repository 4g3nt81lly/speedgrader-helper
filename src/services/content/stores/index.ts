import { defaultAppSettings, type AppSettings } from '#shared/settings';
import type { Nullable } from '#shared/types/utils';
import StateStore from '#shared/utils/browser/StateStore';
import type { GradingContext } from './GradingContext';

export type ContentState = {
	appSettings: AppSettings;
	gradingContext: Nullable<GradingContext>;
};

export const store = new StateStore<ContentState>({
	appSettings: defaultAppSettings,
	gradingContext: null,
});
