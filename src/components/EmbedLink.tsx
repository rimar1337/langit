import { Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';

import type { RefOf } from '@intrnl/bluesky-client/atp-schema';

import BlobImage from '~/components/BlobImage.tsx';

type EmbeddedLink = RefOf<'app.bsky.embed.external#viewExternal'>;

export interface EmbedLinkData extends Omit<EmbeddedLink, 'thumb'> {
	thumb?: string | Blob;
}

export interface EmbedLinkProps {
	link: EmbedLinkData;
	interactive?: boolean;
}

const getDomain = (url: string) => {
	try {
		const host = new URL(url).host;
		return host.startsWith('www.') ? host.slice(4) : host;
	} catch {
		return url;
	}
};

const EmbedLink = (props: EmbedLinkProps) => {
	const link = () => props.link;
	const interactive = () => props.interactive;

	return (
		<Dynamic
			component={interactive() ? 'a' : 'div'}
			href={link().uri}
			rel="noopener noreferrer nofollow"
			target="_blank"
			class="flex overflow-hidden rounded-2xl border border-divider"
			classList={{ 'hover:bg-secondary/30': interactive() }}
		>
			<Show when={link().thumb} keyed>
				{(thumb) => (
					<BlobImage
						src={thumb}
						class="aspect-square w-[86px] border-r border-divider object-cover sm:w-30"
					/>
				)}
			</Show>
			<Show when={!link().thumb}>
				<div class="aspect-square w-[86px] min-w-[86px] border-r border-divider object-cover sm:w-[7.5rem] sm:min-w-[7.5rem] bg-divider/70">
				<div class=" fill-muted-fg flex m-7 sm:m-10 w-auto h-auto"><svg viewBox="0 0 24 24"><g><path d="M20 5v14H4V5h16m0-2H4c-1.11 0-2 .89-2 2v14c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2m-2 12H6v2h12v-2m-8-8H6v6h4V7m2 2h6V7h-6v2m6 2h-6v2h6v-2Z"></path></g></svg></div>
				</div>
			</Show>

			<div class="flex min-w-0 flex-col justify-center gap-0.5 p-3 text-[15px] font-normal leading-5 max-h-[120px]">
				<p class="text-muted-fg">{getDomain(link().uri)}</p>
				<p class="line-clamp-1 empty:hidden">{link().title}</p>

				<div class="hidden sm:block">
					<p class="line-clamp-2 text-muted-fg empty:hidden">{link().description}</p>
				</div>
			</div>
		</Dynamic>
	);
};

export default EmbedLink;
