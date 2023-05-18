import { For, Match, Show, Switch, createEffect } from 'solid-js';

import { useLocation } from '@solidjs/router';
import { createQuery } from '@tanstack/solid-query';

import { getPostThread, getPostThreadKey } from '~/api/query.ts';

import { A, useParams } from '~/router.ts';
import { ENTRY_KEY } from '~/utils/router.ts';

import CircularProgress from '~/components/CircularProgress.tsx';
import Embed from '~/components/Embed.tsx';
import Post from '~/components/Post.tsx';

import MoreHorizIcon from '~/icons/baseline-more-horiz.tsx';

const seen = new Set<string>();

const AuthenticatedPostPage = () => {
	const location = useLocation();
	const params = useParams('/u/:uid/profile/:actor/post/:status');

	const uid = () => params.uid;

	const threadQuery = createQuery({
		queryKey: () => getPostThreadKey(params.uid, params.actor, params.status),
		queryFn: getPostThread,
		staleTime: 15_000,
		refetchOnMount: true,
		refetchOnReconnect: false,
		refetchOnWindowFocus: false,
		retry: false,
	});

	const focusRef = (node: HTMLDivElement) => {
		createEffect(() => {
			const state = location.state as any;

			if (!state) {
				return;
			}

			const key = state[ENTRY_KEY];

			if (threadQuery.data && !seen.has(key)) {
				seen.add(key);
				node.scrollIntoView();
			}
		});
	};

	return (
		<div class='flex flex-col'>
			<div class='bg-background flex items-center h-13 px-4 border-b border-divider sticky top-0 z-10'>
				<p class='font-bold text-base'>Post</p>
			</div>

			<Switch>
				<Match when={threadQuery.isLoading}>
					<div class='h-13 flex items-center justify-center'>
						<CircularProgress />
					</div>
				</Match>

				<Match when={threadQuery.data}>
					{(data) => {
						const post = () => data().post.value;

						const record = () => post().record;
						const author = () => post().author;

						return (
							<>
								<div ref={focusRef} class='px-4 py-3'>
									<div class='flex items-center gap-3 mb-1'>
										<A
											href='/u/:uid/profile/:actor'
											params={{ uid: uid(), actor: author().did }}
											class='h-12 w-12 shrink-0 rounded-full bg-muted-fg overflow-hidden hover:opacity-80'
										>
											<Show when={author().avatar}>
												{(avatar) => <img src={avatar()} class='h-full w-full' />}
											</Show>
										</A>

										<A
											href='/u/:uid/profile/:actor'
											params={{ uid: uid(), actor: author().did }}
											class='flex flex-col text-sm'
										>
											<span class='font-bold break-all whitespace-pre-wrap break-words line-clamp-1 hover:underline'>
												{author().displayName}
											</span>
											<span class='text-muted-fg break-all whitespace-pre-wrap line-clamp-1'>
												@{author().handle}
											</span>
										</A>

										<div class='flex justify-end grow shrink-0'>
											<button class='flex items-center justify-center h-8 w-8 -my-1.5 -mx-2 rounded-full text-base text-muted-fg hover:bg-secondary'>
												<MoreHorizIcon />
											</button>
										</div>
									</div>

									<Show when={record().text}>
										{(text) => (
											<div class='text-base whitespace-pre-wrap break-words mt-3'>
												{text()}
											</div>
										)}
									</Show>

									<Show when={post().embed}>
										{(embed) => <Embed uid={uid()} embed={embed()} large />}
									</Show>
								</div>

								<hr class='border-divider' />

								<For each={data().descendants}>
									{(slice) => {
										const items = slice.items;
										const len = items.length;

										return items.map((item, idx) => (
											<Post
												uid={uid()}
												post={item.value}
												prev={idx !== 0}
												next={idx !== len - 1}
											/>
										));
									}}
								</For>
							</>
						);
					}}
				</Match>
			</Switch>
		</div>
	);
};

export default AuthenticatedPostPage;