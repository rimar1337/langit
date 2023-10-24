import { For, Match, Show, Switch, createMemo } from 'solid-js';

import type { DID } from '@intrnl/bluesky-client/atp-schema';
import { createQuery } from '@intrnl/sq';
import { useLocation } from '@solidjs/router';

import { getTrendingTopics, getTrendingTopicsKey } from '~/api/queries/get-trending-topics.ts';

import { generatePath } from '~/router.ts';

import CircularProgress from '~/components/CircularProgress.tsx';
import SearchInput from '~/components/SearchInput.tsx';

export interface RightSidebarProps {
	uid: DID;
}

const RightSidebar = (props: RightSidebarProps) => {
	const location = useLocation();

	const isExplorePage = createMemo(() => {
		const path = location.pathname;
		const expected = `/u/${props.uid}/explore`;

		return path.startsWith(expected) && path.slice(expected.length) !== '/tags';
	});

	return (
		<div class="sticky top-0 flex h-screen flex-col gap-4 overflow-y-auto p-4">
			<Show when={!isExplorePage()}>
				<div>
					<SearchInput onEnter={() => {}} />
				</div>
			</Show>

			<TrendingSection uid={props.uid} />
		</div>
	);
};

export default RightSidebar;

const TrendingSection = (props: { uid: DID }) => {
	const [trending] = createQuery({
		key: getTrendingTopicsKey,
		fetch: getTrendingTopics,
		staleTime: 5 * 60_000, // 5 minutes
	});

	return (
		<div class="flex flex-col px-4 text-sm">
			<h3 class="mb-2 font-bold text-muted-fg">Trending now</h3>

			<Switch>
				<Match when={trending()}>
					{(trending) => (
						<>
							<For each={trending().slice(0, 5)}>
								{(topic) => (
									<a href="#" class="-mx-4 rounded px-4 py-2 hover:bg-hinted">
										<p class="font-bold">#{topic.name}</p>
										<p class="text-muted-fg">{topic.count} posts</p>
									</a>
								)}
							</For>

							<a
								link
								href={generatePath('/u/:uid/explore/tags', props)}
								class="-mx-4 rounded px-4 py-2 text-accent hover:bg-hinted"
							>
								Show more
							</a>
						</>
					)}
				</Match>

				<Match when>
					<div class="flex justify-center">
						<CircularProgress />
					</div>
				</Match>
			</Switch>
		</div>
	);
};
