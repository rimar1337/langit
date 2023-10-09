import { For, Match, Show, Switch, createMemo, createSignal, onCleanup } from 'solid-js';

import type { DID } from '@intrnl/bluesky-client/atp-schema';
import { createQuery } from '@intrnl/sq';
import { useNavigate } from '@solidjs/router';

import { getRecordId, getRepoId } from '~/api/utils.ts';

import {
	getFeedGenerator,
	getFeedGeneratorKey,
	getInitialFeedGenerator,
} from '~/api/queries/get-feed-generator.ts';
import { getTimeline, getTimelineKey } from '~/api/queries/get-timeline';

import { preferences } from '~/globals/preferences.ts';
import { generatePath, useParams } from '~/router.ts';
import { Title } from '~/utils/meta.tsx';

import CircularProgress from '~/components/CircularProgress.tsx';
import Post, { createPostKey } from '~/components/Post.tsx';
import SearchInput from '~/components/SearchInput.tsx';
import VirtualContainer from '~/components/VirtualContainer.tsx';

import RefreshIcon from '~/icons/baseline-refresh.tsx';
import SettingsIcon from '~/icons/baseline-settings.tsx';

import ArrowLeftIcon from '~/icons/baseline-arrow-left.tsx';

const MAX_POSTS = 6;

const AuthenticatedExplorePage = () => {
	const params = useParams('/u/:uid/explore');
	const navigate = useNavigate();

	const uid = () => params.uid as DID;

	const savedFeeds = createMemo(() => {
		return preferences[uid()]?.savedFeeds;
	});

	const [refetching, setRefetching] = createSignal(false);
	const refetches: (() => void | Promise<void>)[] = [];

	const refetchAll = () => {
		const promises: Promise<void>[] = [];

		for (let idx = 0, len = refetches.length; idx < len; idx++) {
			const refetch = refetches[idx];
			const promise = refetch();

			if (promise) {
				promises.push(promise);
			}
		}

		if (promises.length > 0) {
			setRefetching(true);
			Promise.all(promises).then(() => setRefetching(false));
		}
	};
	const handleGoBack = () => {
		window.history.go(-1); // Go back one step in browser history
	};

	return (
		<div class="flex flex-col pb-4">
			<Title render='Explore / Langit' />

			<div class="sticky top-0 z-20 flex h-13 items-center gap-2 border-b border-divider bg-background px-4">
				<button onClick={handleGoBack} class="text-base font-bold p-3 -ml-3"><ArrowLeftIcon/></button>
				<SearchInput
					onEnter={(next) => {
						if (next.trim()) {
							const path =
								generatePath('/u/:uid/explore/search', { uid: uid() }) +
								`?t=user&q=${encodeURIComponent(next)}`;

							navigate(path);
						}
					}}
				/>

				<Show when={savedFeeds()}>
					<button
						disabled={refetching()}
						onClick={refetchAll}
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg hover:bg-secondary disabled:pointer-events-none disabled:opacity-50"
					>
						<RefreshIcon />
					</button>
				</Show>

				<a
					link
					href={generatePath('/u/:uid/settings/explore', params)}
					class="-mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg hover:bg-secondary"
				>
					<SettingsIcon />
				</a>
			</div>
			<For
				each={savedFeeds()}
				fallback={
					<div>
						<p class="p-4 text-sm text-muted-fg">It's empty, how about adding some feeds here?</p>
					</div>
				}
			>
				{(feedUri) => {
					const [feed, { refetch: refetchFeed }] = createQuery({
						key: () => getFeedGeneratorKey(uid(), feedUri),
						fetch: getFeedGenerator,
						staleTime: 120_000,
						initialData: getInitialFeedGenerator,
					});

					const [timeline, { refetch: refetchTimeline }] = createQuery({
						key: () => getTimelineKey(uid(), { type: 'custom', uri: feedUri }, MAX_POSTS),
						fetch: getTimeline,
						staleTime: 5_000,
						refetchOnMount: false,
						refetchOnWindowFocus: false,
					});

					const refetch = () => {
						refetchFeed();
						return refetchTimeline();
					};

					refetches.push(refetch);
					onCleanup(() => {
						const idx = refetches.indexOf(refetch);
						refetches.splice(idx, 1);
					});

					return (
						<Switch>
							<Match when={feed()}>
								<div class="border-b border-divider">
									<div class="sticky top-13 z-10 flex h-13 items-center gap-4 bg-background px-4">
										<div class="h-6 w-6 overflow-hidden rounded-md bg-muted-fg">
											<Show when={feed()!.avatar.value}>
												{(avatar) => <img src={avatar()} class="h-full w-full" />}
											</Show>
										</div>

										<span class="text-base font-bold">{feed()!.displayName.value}</span>
									</div>

									<Switch>
										<Match when={timeline.error}>
											<p class="p-4 text-sm text-muted-fg">Something went wrong with retrieving the feed</p>
										</Match>

										<Match when={timeline()}>
											<For
												each={timeline()!.pages[0].slices}
												fallback={
													<p class="p-4 text-sm text-muted-fg">Looks like there's nothing here yet!</p>
												}
											>
												{(slice) => {
													const items = slice.items;
													const len = items.length;

													return items.map((item, idx) => (
														<VirtualContainer
															estimateHeight={98.8}
															id={createPostKey(
																item.post.cid.value,
																(!!item.reply?.parent && idx === 0) || !!item.reason,
																idx !== len - 1,
															)}
														>
															<Post
																interactive
																uid={uid()}
																post={/* @once */ item.post}
																parent={/* @once */ item.reply?.parent}
																reason={/* @once */ item.reason}
																prev={idx !== 0}
																next={idx !== len - 1}
															/>
														</VirtualContainer>
													));
												}}
											</For>

											<Show when={timeline()?.pages[0].cid}>
												<a
													link
													href={generatePath('/u/:uid/profile/:actor/feed/:feed', {
														uid: uid(),
														actor: getRepoId(feedUri),
														feed: getRecordId(feedUri),
													})}
													class="flex h-13 items-center px-4 text-sm text-accent hover:bg-hinted"
												>
													Show more
												</a>
											</Show>
										</Match>

										<Match when>
											<div class="flex h-13 items-center justify-center">
												<CircularProgress />
											</div>
										</Match>
									</Switch>
								</div>
							</Match>

							<Match when>
								<div class="flex h-13 items-center justify-center border-b border-divider">
									<CircularProgress />
								</div>
							</Match>
						</Switch>
					);
				}}
			</For>
		</div>
	);
};

export default AuthenticatedExplorePage;
