import { Show } from 'solid-js';

import type { DID } from '@intrnl/bluesky-client/atp-schema';
import { createQuery } from '@intrnl/sq';
import { useSearchParams } from '@solidjs/router';

import { getPopularFeedGenerators, getPopularFeedGeneratorsKey } from '~/api/queries/get-feed-generator.ts';

import { useParams } from '~/router.ts';

import FeedList from '~/components/FeedList.tsx';
import SearchInput from '~/components/SearchInput.tsx';

import ArrowLeftIcon from '~/icons/baseline-arrow-left.tsx';

const AuthenticatedAddFeedPage = () => {
	const params = useParams('/u/:uid/settings/explore/add');

	const uid = () => params.uid as DID;

	const [searchParams, setSearchParams] = useSearchParams<{ q?: string }>();

	const [feeds, { refetch }] = createQuery({
		key: () => getPopularFeedGeneratorsKey(uid(), searchParams.q),
		fetch: getPopularFeedGenerators,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});

	const handleGoBack = () => {
		window.history.go(-1); // Go back one step in browser history
	};

	return (
		<div class="flex flex-col">
			<div class="sticky top-0 z-10 flex h-13 items-center border-b border-divider bg-background/70 backdrop-blur-md px-4">
				<button onClick={handleGoBack} class="text-base font-bold mr-3 p-3 -ml-3"><ArrowLeftIcon/></button>
				<p class="text-base font-bold leading-5">Discover feeds</p>
			</div>

			<div class="p-4 pb-1">
				<SearchInput
					value={searchParams.q}
					placeholder="Search custom feeds"
					onEnter={(next) => setSearchParams({ q: next }, { replace: true })}
				/>
			</div>

			<Show when={searchParams.q}>
				{(q) => (
					<p class="px-4 pb-2 pt-3 text-sm text-muted-fg">
						Searching for "<span class="whitespace-pre-wrap">{q()}</span>"
					</p>
				)}
			</Show>

			<FeedList uid={uid()} feeds={feeds} onLoadMore={(cursor) => refetch(true, cursor)} />
		</div>
	);
};

export default AuthenticatedAddFeedPage;
