import { For, Show, Suspense, createEffect, createMemo } from 'solid-js';

import type { DID } from '@intrnl/bluesky-client/atp-schema';
import { createQuery } from '@intrnl/sq';
import { useSearchParams } from '@solidjs/router';

import {
	getFeedGenerator,
	getFeedGeneratorKey,
	getInitialFeedGenerator,
} from '~/api/queries/get-feed-generator.ts';
import {
	type CustomTimelineParams,
	type HomeTimelineParams,
	getTimeline,
	getTimelineKey,
	getTimelineLatest,
	getTimelineLatestKey,
} from '~/api/queries/get-timeline.ts';

import { preferences } from '~/globals/preferences.ts';
import { useParams } from '~/router.ts';
import { Title } from '~/utils/meta.tsx';

import { Tab } from '~/components/Tab.tsx';
import TimelineList from '~/components/TimelineList.tsx';

import { isUpdateReady, updateSW } from '~/utils/service-worker.ts';

const FeedTab = (props: { uid: DID; uri: string; active: boolean; onClick?: () => void }) => {
	const [feed] = createQuery({
		key: () => getFeedGeneratorKey(props.uid, props.uri),
		fetch: getFeedGenerator,
		staleTime: 30_000,
		initialData: getInitialFeedGenerator,
	});

	return (
		<Tab<'button'> component="button" active={props.active} onClick={props.onClick}>
			{feed()?.displayName.value}
		</Tab>
	);
};

const Feed = (props: { uid: DID; params: HomeTimelineParams | CustomTimelineParams }) => {
	const uid = () => props.uid;
	const params = () => props.params;

	const [timeline, { refetch }] = createQuery({
		key: () => getTimelineKey(uid(), params()),
		fetch: getTimeline,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});

	const [latest, { mutate: mutateLatest }] = createQuery({
		key: () => getTimelineLatestKey(uid(), params()),
		fetch: getTimelineLatest,
		staleTime: 10_000,
		refetchInterval: 30_000,
		enabled: () => {
			const $timeline = timeline();

			if (!$timeline || !$timeline.pages[0].cid) {
				return false;
			}

			return true;
		},
	});

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

	return (
		<TimelineList
			uid={uid()}
			timeline={timeline}
			latest={latest}
			onLoadMore={(cursor) => refetch(true, cursor)}
			onRefetch={() => refetch(true)}
		/>
	);
};

const AuthenticatedHome = () => {
	const params = useParams('/u/:uid');
	const [searchParams, setSearchParams] = useSearchParams<{ feed?: string }>();

	const uid = () => params.uid as DID;
	const feed = () => searchParams.feed;

	const pinnedFeeds = createMemo(() => {
		const arr = preferences[uid()]?.pinnedFeeds;
		return arr && arr.length > 0 ? arr : undefined;
	});

	return (
		<div class="flex grow flex-col">
			<Title render="Home / Langit" />

			<div
				class="flex h-13 items-center px-4 place-content-between"
				classList={{ 'sticky top-0 z-10 border-b border-divider bg-background/70 backdrop-blur-md': !pinnedFeeds() }}
			>
				<p class="text-base font-bold">Home</p>
				<Show when={isUpdateReady()}>
					<button
					onClick={() => {
						updateSW();
					}}
					class="flex items-center gap-4 px-3 xl:px-4 py-1.5 xl:py-2 text-sm hover:bg-hinted rounded-full bg-primary hover:bg-primary/90 text-primary-fg font-bold"
					>
						<span>Update application</span>
					</button>
				</Show>
			</div>

			<Show when={pinnedFeeds()}>
				<Suspense fallback={<hr class="-mt-px border-divider" />}>
					<div class="sticky top-0 z-10 flex h-10 xl:h-13 items-center overflow-x-auto border-b border-divider bg-background/70 backdrop-blur-md">
						<Tab<'button'>
							component="button"
							active={!feed()}
							onClick={() => {
								setSearchParams({ feed: null }, { replace: true });
								window.scrollTo({ top: 0 });
							}}
						>
							Following
						</Tab>

						<For each={pinnedFeeds()}>
							{(uri) => (
								<FeedTab
									uid={uid()}
									uri={uri}
									active={feed() === uri}
									onClick={() => {
										setSearchParams({ feed: uri }, { replace: true });
										window.scrollTo({ top: 0 });
									}}
								/>
							)}
						</For>
					</div>
				</Suspense>
			</Show>

			<Show when={feed() ?? true} keyed>
				{($feed) => {
					const params: HomeTimelineParams | CustomTimelineParams =
						$feed !== true
							? { type: 'custom', uri: $feed }
							: { type: 'home', algorithm: 'reverse-chronological' };

					return <Feed uid={uid()} params={params} />;
				}}
			</Show>
		</div>
	);
};

export default AuthenticatedHome;
