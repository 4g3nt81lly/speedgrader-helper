import type { ErrorInfo, PropsWithChildren, ReactNode } from 'react';
import { FallbackProps, ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';

type ErrorBoundaryProps = PropsWithChildren<{
	fallback?: ReactNode;
	fallbackRender?: (props: FallbackProps) => ReactNode;
	onError?: (error: unknown, info: ErrorInfo) => void;
}>;

export function ErrorBoundary(props: ErrorBoundaryProps) {
	const { fallback, fallbackRender, onError, children } = props;
	return (
		<ReactErrorBoundary
			fallbackRender={(props) => fallback ?? fallbackRender?.(props) ?? <></>}
			onError={onError}
		>
			{children}
		</ReactErrorBoundary>
	);
}

export function errorBoundary<Props>(
	component: (props: Props) => ReactNode,
	props: ErrorBoundaryProps
) {
	return function (componentProps: Props) {
		return <ErrorBoundary {...props}>{component(componentProps)}</ErrorBoundary>;
	};
}
