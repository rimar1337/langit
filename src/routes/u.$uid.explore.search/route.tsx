import type { Component } from 'solid-js';
import { Dynamic } from 'solid-js/web';

import type { DID } from '@intrnl/bluesky-client/atp-schema';
import { useSearchParams } from '@solidjs/router';

import { useParams } from '~/router.ts';

import SearchInput from '~/components/SearchInput.tsx';
import { Tab } from '~/components/Tab.tsx';

import SearchUsers from './SearchUsers.tsx';
import SearchPosts from './SearchPosts.tsx';

import ArrowLeftIcon from '~/icons/baseline-arrow-left.tsx';

const enum SearchType {
	USERS = 'user',
	POSTS = 'post',
}

export interface SearchComponentProps {
	uid: DID;
	query: string;
}

const pages: Record<SearchType, Component<SearchComponentProps>> = {
	[SearchType.USERS]: SearchUsers,
	[SearchType.POSTS]: SearchPosts,
};

const AuthenticatedSearchPage = () => {
	const params = useParams('/u/:uid/explore/search');
	const [searchParams, setSearchParams] = useSearchParams<{ q?: string; t?: SearchType }>();

	const type = () => searchParams.t ?? SearchType.USERS;
	const query = () => searchParams.q ?? '';

	const bindTabClick = (type: SearchType) => () => {
		setSearchParams({ t: type }, { replace: true });
	};

	const handleGoBack = () => {
		window.history.go(-1); // Go back one step in browser history
	};


	return (
		<div class="flex flex-col">
			<div class="sticky top-0 z-20 bg-background">
				<div class="flex h-13 items-center gap-2 px-4">
					<button onClick={handleGoBack} class="text-base font-bold p-3 -ml-3"><ArrowLeftIcon/></button>
					<SearchInput
						value={query()}
						onEnter={(next) => {
							if (next.trim()) {
								setSearchParams({ q: next }, { replace: true });
							}
						}}
					/>
				</div>

				<div class="flex h-10 xl:h-13 overflow-x-auto border-b border-divider">
					<Tab
						component="button"
						active={type() === SearchType.POSTS}
						onClick={bindTabClick(SearchType.POSTS)}
					>
						Posts
					</Tab>
					<Tab
						component="button"
						active={type() === SearchType.USERS}
						onClick={bindTabClick(SearchType.USERS)}
					>
						Users
					</Tab>
				</div>
			</div>

			<Dynamic component={pages[type()]} uid={params.uid as DID} query={query()} />
		</div>
	);
};

export default AuthenticatedSearchPage;
