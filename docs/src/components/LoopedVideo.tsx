import useBaseUrl from '@docusaurus/useBaseUrl';
import type { SyntheticEvent } from 'react';

type LoopedVideoProps = {
	src: string;
	width?: string | number;
	delaySeconds?: number;
};

export default function LoopedVideo(props: LoopedVideoProps) {
	const { src, width, delaySeconds } = props;

	function delayedReplay(event: SyntheticEvent<HTMLVideoElement>) {
		if (typeof delaySeconds !== 'number') return;

		const videoElement = event.target as HTMLVideoElement;
		setTimeout(() => videoElement.play().catch(() => {}), delaySeconds * 1000);
	}

	return (
		<video
			src={useBaseUrl(src)}
			autoPlay
			muted
			playsInline
			controls={false}
			onEnded={delayedReplay}
			width={width ?? '100%'}
		/>
	);
}
