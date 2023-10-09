import { Match, Show, Switch, createEffect, createMemo } from 'solid-js';

import type { DID } from '@intrnl/bluesky-client/atp-schema';
import { createQuery } from '@intrnl/sq';

import { favoriteFeed } from '~/api/mutations/favorite-feed.ts';
import {
	createFeedGeneratorUri,
	getFeedGenerator,
	getFeedGeneratorKey,
	getInitialFeedGenerator,
} from '~/api/queries/get-feed-generator.ts';
import { getProfileDid, getProfileDidKey } from '~/api/queries/get-profile-did.ts';
import {
	type CustomTimelineParams,
	getTimeline,
	getTimelineKey,
	getTimelineLatest,
	getTimelineLatestKey,
} from '~/api/queries/get-timeline.ts';

import { getAccountPreferences } from '~/globals/preferences.ts';
import { generatePath, useParams } from '~/router.ts';
import * as comformat from '~/utils/intl/comformatter.ts';
import { Title } from '~/utils/meta.tsx';

import TimelineList from '~/components/TimelineList.tsx';
import button from '~/styles/primitives/button.ts';

import FavoriteOutlinedIcon from '~/icons/outline-favorite.tsx';
import FavoriteIcon from '~/icons/baseline-favorite';

import ArrowLeftIcon from '~/icons/baseline-arrow-left.tsx';

const AuthenticatedFeedPage = () => {
	const params = useParams('/u/:uid/profile/:actor/feed/:feed');

	const uid = () => params.uid as DID;
	const actor = () => params.actor;
	const feed = () => params.feed;

	const [did] = createQuery({
		key: () => getProfileDidKey(uid(), actor()),
		fetch: getProfileDid,
		staleTime: 60_000,
	});

	const feedUri = () => createFeedGeneratorUri(did()!, feed());
	const feedParams = (): CustomTimelineParams => ({ type: 'custom', uri: feedUri() });

	const [info] = createQuery({
		key: () => getFeedGeneratorKey(uid(), feedUri()),
		fetch: getFeedGenerator,
		staleTime: 60_000,
		initialData: getInitialFeedGenerator,
		enabled: () => !!did(),
	});

	const [timeline, { refetch }] = createQuery({
		key: () => getTimelineKey(uid(), feedParams()),
		fetch: getTimeline,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		enabled: () => !!did(),
	});

	const [latest, { mutate: mutateLatest }] = createQuery({
		key: () => getTimelineLatestKey(uid(), feedParams()),
		fetch: getTimelineLatest,
		staleTime: 10_000,
		refetchInterval: 30_000,
		enabled: () => {
			const $did = did();
			const $timeline = timeline();

			if (!$did || !$timeline || !$timeline.pages[0].cid) {
				return false;
			}

			return true;
		},
	});

	const isSaved = createMemo(() => {
		const $prefs = getAccountPreferences(uid());
		const saved = $prefs?.savedFeeds;

		return !!saved && saved.includes(feedUri());
	});

	const toggleSave = () => {
		const $prefs = getAccountPreferences(uid());
		const saved = $prefs.savedFeeds;

		const uri = feedUri();

		if (isSaved()) {
			if (saved) {
				const idx = saved.indexOf(uri);
				saved.splice(idx, 1);

				if (saved.length === 0) {
					$prefs.savedFeeds = undefined;
				}
			}
		} else if (saved) {
			saved.push(uri);
		} else {
			$prefs.savedFeeds = [uri];
		}
	};

	createEffect((prev: ReturnType<typeof timeline> | 0) => {
		const next = timeline();

		if (prev !== 0 && next) {
			const pages = next.pages;
			const length = pages.length;

			if (length === 1) {
				mutateLatest({ cid: pages[0].cid });
			}
		}

		return next;
	}, 0 as const);

	const handleGoBack = () => {
		window.history.go(-1); // Go back one step in browser history
	};

	return (
		<div class="flex flex-col">
			<div class="sticky top-0 z-10 flex h-13 items-center border-b border-divider bg-background/70 backdrop-blur-md px-4">
				<Switch>
					<Match when={info()}>
						{(info) => (
							<>
								<Title
									render={() => {
										const $info = info();
										return `Feed (${$info.displayName.value || feed()}) / Langit`;
									}}
								/>
								<button onClick={handleGoBack} class="text-base font-bold mr-3 p-3 -ml-3"><ArrowLeftIcon/></button>
								<p class="text-base font-bold">{info().displayName.value}</p>
							</>
						)}
					</Match>

					<Match when>
						<Title render={() => `Feed (${feed()}) / Langit`} />
						<button onClick={handleGoBack} class="text-base font-bold mr-3 p-3 -ml-3"><ArrowLeftIcon/></button>
						<p class="text-base font-bold">Feed</p>
					</Match>
				</Switch>
			</div>

			<Show when={info()}>
				{(info) => {
					const creator = () => info().creator;
					const isLiked = () => info().viewer.like.value;

					return (
						<>
							<div class="flex flex-col gap-3 border-b border-divider px-4 pb-4 pt-3">
								<div class="flex gap-4">
									<div class="mt-2 grow">
										<p class="break-words text-lg font-bold">{info().displayName.value}</p>
										<p class="text-sm text-muted-fg">
											<span>by </span>
											<a
												link
												href={generatePath('/u/:uid/profile/:actor', { uid: uid(), actor: creator().did })}
												class="hover:underline"
											>
												@{creator().handle.value}
											</a>
										</p>
									</div>

									<div class="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted-fg">
										<Show when={info().avatar.value}>
											{(avatar) => <img src={avatar()} class="h-full w-full" />}
										</Show>
									</div>
								</div>

								<Show when={info().description.value}>
									<div class="whitespace-pre-wrap break-words text-sm">{info().$renderedDescription()}</div>
								</Show>

								<p class="text-sm text-muted-fg">Liked by {comformat.format(info().likeCount.value)} users</p>

								<div class="flex gap-2">
									<button onClick={toggleSave} class={button({ color: isSaved() ? 'outline' : 'primary' })}>
										{isSaved() ? 'Remove feed' : 'Add feed'}
									</button>

									<button
										title={isLiked() ? 'Unlike this feed' : 'Like this feed'}
										onClick={() => favoriteFeed(uid(), info())}
										class={/* @once */ button({ color: 'outline' })}
									>
										{isLiked() ? (
											<FavoriteIcon class="-mx-1.5 text-base text-red-600" />
										) : (
											<FavoriteOutlinedIcon class="-mx-1.5 text-base" />
										)}
									</button>
								</div>
							</div>
						</>
					);
				}}
			</Show>

			<Show when={!info.error}>
				<TimelineList
					uid={uid()}
					timeline={timeline}
					latest={latest}
					onLoadMore={(cursor) => refetch(true, cursor)}
					onRefetch={() => refetch(true)}
				/>
			</Show>
		</div>
	);
};

export default AuthenticatedFeedPage;
