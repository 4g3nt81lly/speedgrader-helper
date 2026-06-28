import { io } from 'socket.io-client';

export default function configDev() {
	const socket = io(import.meta.env.VITE_DEV_WS_SERVER_URI, {
		transports: ['websocket'],
		auth: { role: 'app' },
	});
	socket.on('hr', (name, ...args) => {
		switch (name) {
			case 'reload':
				return reloadExtension();
			case 'reloadActiveTabs':
				return reloadActiveTabs();
		}
	});
}

function reloadExtension() {
	chrome.runtime.reload();
}

async function reloadActiveTabs() {
	const activeTabs = await chrome.tabs.query({ active: true });
	for (const activeTab of activeTabs) {
		if (!activeTab.id) continue;
		chrome.tabs.reload(activeTab.id);
	}
}
