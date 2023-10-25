import { For, Match, Show, Switch, createMemo } from 'solid-js';

import type { DID } from '@intrnl/bluesky-client/atp-schema';
import { createQuery } from '@intrnl/sq';
import { useLocation, useNavigate } from '@solidjs/router';

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
		<div class="sticky top-0 flex h-screen flex-col gap-3 overflow-y-auto px-4 py-3">
			<Show when={!isExplorePage()}>
				{(_value) => {
					const navigate = useNavigate();

					return (
						<div class="-mt-1">
							<SearchInput
								onEnter={(next) => {
									if (next.trim()) {
										const path =
											generatePath('/u/:uid/explore/search', props) + `?t=user&q=${encodeURIComponent(next)}`;

										navigate(path);
									}
								}}
								tall
							/>
						</div>
					);
				}}
			</Show>

			<TrendingSection {...props} />
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
		<div class="flex flex-col text-sm bg-lightbg rounded-2xl">
			<h3 class="px-4 py-3 font-bold text-xl text-[24px]">Trending now</h3>

			<Switch>
				<Match when={trending()}>
					{(trending) => (
						<>
							<For each={trending().slice(0, 8)}>
								{(topic) => (
									<a
										link
										href={generatePath('/u/:uid/tags/:tag', { uid: props.uid, tag: topic.name })}
										class="px-4 py-3 hover:bg-gray-500/10"
									>
										<p class="font-bold text-[15px]">#{topic.name}</p>
										<p class="text-muted-fg text-[13px]">{topic.count} posts</p>
									</a>
								)}
							</For>

							<a
								link
								href={generatePath('/u/:uid/explore/tags', props)}
								class="rounded-b-2xl px-4 pt-2 pb-3 text-accent hover:bg-gray-500/10"
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
