import { For, Match, Show, Switch, createMemo } from 'solid-js';

import type { DID, RefOf } from '@intrnl/bluesky-client/atp-schema';
import { XRPCError } from '@intrnl/bluesky-client/xrpc-utils';
import { createQuery } from '@intrnl/sq';
import { useNavigate } from '@solidjs/router';

import { getCollectionCursor } from '~/api/utils.ts';

import { getList, getListKey } from '~/api/queries/get-list.ts';

import { openModal } from '~/globals/modals.tsx';
import { generatePath, useParams } from '~/router.ts';
import { Title } from '~/utils/meta.tsx';
import { INTERACTION_TAGS, isElementAltClicked, isElementClicked } from '~/utils/misc.ts';

import CircularProgress from '~/components/CircularProgress.tsx';
import button from '~/styles/primitives/button.ts';

import EditIcon from '~/icons/baseline-edit.tsx';
import MoreHorizIcon from '~/icons/baseline-more-horiz.tsx';

import ListMenu from './ListMenu.tsx';
import SubscribeListDialog from './SubscribeListDialog.tsx';

import ArrowLeftIcon from '~/icons/baseline-arrow-left.tsx';

const enum Subscription {
	MUTED = 1,
	BLOCKED,
}

type ListPurpose = RefOf<'app.bsky.graph.defs#listPurpose'>;

const ListPurposeLabels: Record<ListPurpose, string> = {
	'app.bsky.graph.defs#modlist': 'Moderation list',
	'app.bsky.graph.defs#curatelist': 'Curation list',
};

const AuthenticatedListPage = () => {
	const params = useParams('/u/:uid/profile/:actor/lists/:list');
	const navigate = useNavigate();

	const uid = () => params.uid as DID;

	const [listing, { refetch }] = createQuery({
		key: () => getListKey(uid(), params.actor, params.list),
		fetch: getList,
		refetchOnMount: false,
		refetchOnReconnect: false,
		refetchOnWindowFocus: false,
	});

	const list = createMemo(() => {
		return listing()?.pages[0].list;
	});

	const subscription = createMemo(() => {
		const $list = list();

		if ($list) {
			const $viewer = $list.viewer;

			if ($viewer.blocked.value) {
				return Subscription.BLOCKED;
			} else if ($viewer.muted.value) {
				return Subscription.MUTED;
			}
		}

		return undefined;
	});

	const purpose = () => {
		const raw = list()?.purpose.value;
		return raw && raw in ListPurposeLabels ? ListPurposeLabels[raw] : `Unknown list`;
	};

	const handleGoBack = () => {
		window.history.go(-1); // Go back one step in browser history
	};

	return (
		<div class="flex grow flex-col">
			<div class="sticky top-0 z-10 flex h-13 items-center border-b border-divider bg-background/70 backdrop-blur-md px-4">
				<Switch>
					<Match when={list()}>
						{(info) => (
							<>
								<Title render={() => `List (${info().name.value}) / Langit`} />
								<button onClick={handleGoBack} class="text-base font-bold mr-3 p-3 -ml-3"><ArrowLeftIcon/></button>
								<p class="text-base font-bold">{info().name.value}</p>
							</>
						)}
					</Match>

					<Match when>
						<Title render={() => `List (${params.list}) / Langit`} />
						<button onClick={handleGoBack} class="text-base font-bold mr-3 p-3 -ml-3"><ArrowLeftIcon/></button>
						<p class="text-base font-bold">List</p>
					</Match>
				</Switch>
			</div>

			<Show when={list()}>
				{(list) => {
					const creator = () => list().creator;

					return (
						<>
							<div class="flex flex-col gap-3 border-b border-divider px-4 pb-4 pt-3">
								<div class="flex gap-4">
									<div class="mt-2 grow">
										<p class="break-words text-lg font-bold">{list().name.value}</p>
										<p class="text-sm text-muted-fg">
											<span>{purpose()} by </span>
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
										<Show when={list().avatar.value}>
											{(avatar) => <img src={avatar()} class="h-full w-full" />}
										</Show>
									</div>
								</div>

								<Show when={list().description.value}>
									<div class="whitespace-pre-wrap break-words text-sm">{list().$renderedDescription()}</div>
								</Show>

								<div class="flex gap-2">
									<button
										onClick={() => {
											openModal(() => <SubscribeListDialog uid={uid()} list={list()} />);
										}}
										class={button({ color: subscription() ? 'outline' : 'primary' })}
									>
										{subscription() ? 'Unsubscribe list' : 'Subscribe list'}
									</button>

									<div class="grow" />

									<Show when={creator().did === uid()}>
										<a
											link
											href={generatePath('/u/:uid/profile/:actor/lists/:list/edit', params)}
											title="Edit list"
											class={/* @once */ button({ color: 'outline' })}
										>
											<EditIcon class="-mx-1.5 text-base" />
										</a>
									</Show>

									<button
										title="More actions"
										onClick={() => openModal(() => <ListMenu uid={uid()} list={list()} />)}
										class={/* @once */ button({ color: 'outline' })}
									>
										<MoreHorizIcon class="-mx-1.5 text-base" />
									</button>
								</div>
							</div>
						</>
					);
				}}
			</Show>

			<For each={listing()?.pages}>
				{(page) => {
					return page.items.map((item) => {
						const profile = item.subject;

						const click = (ev: MouseEvent | KeyboardEvent) => {
							if (!isElementClicked(ev, INTERACTION_TAGS)) {
								return;
							}

							const path = generatePath('/u/:uid/profile/:actor', { uid: uid(), actor: profile.did });

							if (isElementAltClicked(ev)) {
								open(path, '_blank');
							} else {
								navigate(path);
							}
						};

						return (
							<div
								tabindex={0}
								onClick={click}
								onAuxClick={click}
								onKeyDown={click}
								role="button"
								class="flex gap-3 px-4 py-3 hover:bg-hinted"
							>
								<div class="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted-fg">
									<Show when={profile.avatar.value}>
										{(avatar) => <img src={avatar()} class="h-full w-full" />}
									</Show>
								</div>

								<div class="flex min-w-0 grow flex-col gap-1">
									<div class="flex items-center justify-between gap-3">
										<div class="flex flex-col text-sm">
											<span dir="auto" class="line-clamp-1 break-all font-bold">
												{profile.displayName.value || profile.handle.value}
											</span>
											<span class="line-clamp-1 break-all text-muted-fg">@{profile.handle.value}</span>
										</div>
									</div>

									<Show when={profile.description.value}>
										<div class="line-clamp-3 break-words text-sm">{profile.$renderedDescription()}</div>
									</Show>
								</div>
							</div>
						);
					});
				}}
			</For>

			<Switch>
				<Match when={listing.loading}>
					<div class="flex h-13 items-center justify-center border-divider">
						<CircularProgress />
					</div>
				</Match>

				<Match when={listing.error} keyed>
					{(err) => (
						<div class="grid grow place-items-center">
							<div class="max-w-sm p-4">
								<h1 class="mb-1 text-xl font-bold">Failed to load</h1>
								<p class="break-words text-sm">{err instanceof XRPCError ? err.message : '' + err}</p>
							</div>
						</div>
					)}
				</Match>

				<Match when={getCollectionCursor(listing(), 'cursor')}>
					{(cursor) => (
						<button
							onClick={() => refetch(true, cursor())}
							class="flex h-13 items-center justify-center text-sm text-accent hover:bg-hinted disabled:pointer-events-none mb-8"
						>
							Show more
						</button>
					)}
				</Match>

				<Match when={!!listing()}>
					<div class="flex h-13 items-center justify-center">
						<p class="text-sm text-muted-fg">End of list</p>
					</div>
				</Match>
			</Switch>
		</div>
	);
};

export default AuthenticatedListPage;
