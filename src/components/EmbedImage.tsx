import { Match, Switch, createSignal, lazy } from 'solid-js';

import type { RefOf } from '@intrnl/bluesky-client/atp-schema';

import { openModal } from '~/globals/modals.tsx';

import ImageAltDialog from '~/components/dialogs/ImageAltDialog.tsx';

type EmbeddedImage = RefOf<'app.bsky.embed.images#viewImage'>;

export interface EmbedImageProps {
	images: EmbeddedImage[];
	borderless?: boolean;
	blur?: boolean;
	interactive?: boolean;
	quote?: boolean;
	detailed?: boolean;
}

const LazyImageViewerDialog = lazy(() => import('~/components/dialogs/ImageViewerDialog.tsx'));

const EmbedImage = (props: EmbedImageProps) => {
	const images = () => props.images;

	const interactive = props.interactive;
	const borderless = props.borderless;
	const blur = () => props.blur;
	const isInQuote = () => props.quote;
	const isDetailed = () => props.detailed;


	const render = (index: number, standalone: boolean) => {
		const image = images()[index];
		const alt = image.alt;

		return (
			<div class={'relative overflow-hidden ' + (standalone ? 'min-h-0 grow basis-0' : 'aspect-video')}>
				<img
					src={/* @once */ image.thumb}
					alt={alt}
					onClick={() => {
						if (interactive) {
							const imageViewerComponent = () => <LazyImageViewerDialog images={images()} active={index} />;
							openModal(() => {
							  history.pushState({ modal: true }, '');
							  return imageViewerComponent();
							});
						  }
					}}
					class="h-full w-full object-cover"
					classList={{
						'cursor-pointer': interactive,
						'scale-110': blur(),
						blur: blur() && !borderless,
						'blur-lg': blur() && borderless,
					}}
				/>

				{interactive && alt && (
					<button
						class="absolute bottom-0 left-0 m-2 h-5 rounded bg-black/70 px-1 text-xs font-medium"
						title="Show image description"
						onClick={() => {
							openModal(() => <ImageAltDialog alt={alt} />);
						}}
					>
						ALT
					</button>
				)}
			</div>
		);
	};

	return (
		<div classList={{ 'overflow-hidden rounded-2xl border border-divider': !borderless }}>
			<Switch>
				<Match when={images().length >= 4}>
					<div class={`flex xl:gap-1 gap-0.5 ${isInQuote() && !isDetailed() ? 'aspect-square' : 'aspect-video'}`}>	
						<div class="flex grow basis-0 flex-col xl:gap-1 gap-0.5">
							{render(0, false)}
							{render(2, false)}
						</div>

						<div class="flex grow basis-0 flex-col xl:gap-1 gap-0.5">
							{render(1, false)}
							{render(3, false)}
						</div>
					</div>
				</Match>

				<Match when={images().length >= 3}>
					<div class={`flex xl:gap-1 gap-0.5 ${isInQuote() && !isDetailed() ? 'aspect-square' : 'aspect-video'}`}>	
						<div class="flex grow basis-0 flex-col xl:gap-1 gap-0.5">
							{render(0, true)}
						</div>

						<div class="flex grow basis-0 flex-col xl:gap-1 gap-0.5">
							{render(1, false)}
							{render(2, false)}
						</div>
					</div>
				</Match>

				<Match when={images().length >= 2}>
					<div class={`flex xl:gap-1 gap-0.5 ${isInQuote() && !isDetailed() ? 'aspect-square' : 'aspect-video'}`}>	
						<div class="flex grow basis-0 flex-col xl:gap-1 gap-0.5">
							{render(0, true)}
							</div>
						<div class="flex grow basis-0 flex-col xl:gap-1 gap-0.5">
							{render(1, true)}
							</div>
					</div>
				</Match>

				<Match when={images().length === 1}>
					<div class={`flex ${isInQuote() && !isDetailed() ? 'aspect-square' : ''} ${isDetailed() ? '' : 'max-h-[50vh]'}`}>	
						{render(0, true)}
					</div>
					</Match>
			</Switch>
		</div>
	);
};

export default EmbedImage;
