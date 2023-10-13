import { type Accessor, For, Match, Show, Switch, createSignal, createMemo } from 'solid-js';
import { unwrap } from 'solid-js/store';

import type { DID, RefOf } from '@intrnl/bluesky-client/atp-schema';
import { XRPCError } from '@intrnl/bluesky-client/xrpc-utils';
import { createQuery } from '@intrnl/sq';
import { useLocation, useSearchParams } from '@solidjs/router';

import { type ModerationDecision, CauseLabel } from '~/api/moderation/action.ts';
import { getRecordId, getRepoId } from '~/api/utils.ts';

import type { SignalizedPost } from '~/api/cache/posts.ts';
import { favoritePost } from '~/api/mutations/favorite-post.ts';
import { BlockedThreadError, getPostThread, getPostThreadKey } from '~/api/queries/get-post-thread.ts';

import { openModal } from '~/globals/modals.tsx';
import { getAccountPreferences } from '~/globals/preferences.ts';
import { systemLanguages } from '~/globals/platform.ts';
import { generatePath, useParams } from '~/router.ts';
import * as comformat from '~/utils/intl/comformatter.ts';
import * as relformat from '~/utils/intl/relformatter.ts';
import { Title } from '~/utils/meta.tsx';

import CircularProgress from '~/components/CircularProgress.tsx';
import Embed from '~/components/Embed.tsx';
import EmbedRecordBlocked from '~/components/EmbedRecordBlocked.tsx';
import EmbedRecordNotFound from '~/components/EmbedRecordNotFound.tsx';
import PostMenu from '~/components/menus/PostMenu.tsx';
import PostRepostMenu from '~/components/menus/PostRepostMenu.tsx';
import PostShareMenu from '~/components/menus/PostShareMenu.tsx';
import Post, { createPostKey } from '~/components/Post.tsx';
import VirtualContainer from '~/components/VirtualContainer.tsx';
import button from '~/styles/primitives/button.ts';

import FavoriteIcon from '~/icons/baseline-favorite.tsx';
import MoreHorizIcon from '~/icons/baseline-more-horiz.tsx';
import RepeatIcon from '~/icons/baseline-repeat.tsx';
import ShareIcon from '~/icons/baseline-share.tsx';
import ChatBubbleOutlinedIcon from '~/icons/outline-chat-bubble.tsx';
import FavoriteOutlinedIcon from '~/icons/outline-favorite.tsx';

import ArrowLeftIcon from '~/icons/baseline-arrow-left.tsx';

import PostTranslation from './PostTranslation.tsx';

const seen = new Set<string>();

const MAX_ANCESTORS = 10;
const MAX_DESCENDANTS = 4;

type PageSearchParams = { tl?: 'y' };

const AuthenticatedPostPage = () => {
	const params = useParams('/u/:uid/profile/:actor/post/:status');
	const location = useLocation();

	const [searchParams, setSearchParams] = useSearchParams<PageSearchParams>();

	const uid = () => params.uid as DID;
	const actor = () => params.actor;
	const status = () => params.status;

	const [thread, { refetch }] = createQuery({
		key: () => getPostThreadKey(uid(), actor(), status(), MAX_DESCENDANTS + 1, MAX_ANCESTORS + 1),
		fetch: getPostThread,
		staleTime: 10_000,
		refetchOnMount: true,
		refetchOnReconnect: false,
		refetchOnWindowFocus: false,
	});

	const focusRef = (node: HTMLDivElement) => {
		requestAnimationFrame(() => {
			const $thread = thread();
			const key = location.key;

			if ($thread && key && !seen.has(key)) {
				seen.add(key);
				node.scrollIntoView();
			}
		});
	};

	const handleGoBack = () => {
		window.history.go(-1); // Go back one step in browser history
	};

	return (
		<div class="flex flex-col">
			<Title
				render={() => {
					const $thread = thread();

					if ($thread) {
						const post = $thread.post;

						const author = post.author;
						const record = post.record.value;

						return `${author.displayName.value || `@${author.handle.value}`}: "${record.text}" / Langit`;
					}

					return `Post / Langit`;
				}}
			/>

			<div class="sticky top-0 z-10 flex h-13 items-center border-b border-divider bg-background/70 backdrop-blur-md px-4">
				<button onClick={handleGoBack} class="text-base font-bold mr-3 p-3 -ml-3"><ArrowLeftIcon/></button>
				<p class="text-base font-bold">Post</p>
			</div>

			<Switch>
				<Match when={!thread.loading && thread.error} keyed>
					{(error) => (
						<Switch
							fallback={
								<div class="p-4">
									<div class="mb-4 text-sm">
										<p class="font-bold">Something went wrong</p>
										<p class="text-muted-fg">{'' + error}</p>
									</div>

									<button onClick={() => refetch(true)} class={/* @once */ button({ color: 'primary' })}>
										Try again
									</button>
								</div>
							}
						>
							<Match
								when={(() => {
									if (error instanceof XRPCError && error.error === 'NotFound') {
										return error;
									}
								})()}
							>
								<div class="p-3">
									<EmbedRecordNotFound />
								</div>
							</Match>

							<Match
								when={(() => {
									if (error instanceof BlockedThreadError) {
										return error;
									}
								})()}
							>
								{(err) => {
									const viewer = () => err().view.author.viewer;

									return (
										<Switch>
											<Match when={viewer()?.blocking}>
												<div class="p-4">
													<div class="mb-4 text-sm">
														<p class="font-bold">This post is from a user you blocked</p>
														<p class="text-muted-fg">You need to unblock the user to view the post.</p>
													</div>

													<a
														link
														href={generatePath('/u/:uid/profile/:actor', { uid: uid(), actor: actor() })}
														class={/* @once */ button({ color: 'primary' })}
													>
														View profile
													</a>
												</div>
											</Match>

											<Match when>
												<div class="p-3">
													<EmbedRecordNotFound />
												</div>
											</Match>
										</Switch>
									);
								}}
							</Match>
						</Switch>
					)}
				</Match>

				<Match when={thread()} keyed>
					{(data) => {
						const post = data.post;

						const record = () => post.record.value;
						const author = post.author;

						return (
							<>
								<Show when={data.ancestors} keyed>
									{(items) => {
										let overflowing = false;

										if (items.length > MAX_ANCESTORS) {
											overflowing = true;
											items = items.slice(-MAX_ANCESTORS) as any;
										}

										return (
											<>
												{overflowing && (
													<a
														link
														href={generatePath('/u/:uid/profile/:actor/post/:status', {
															uid: uid(),
															actor: getRepoId(items[0].uri),
															status: getRecordId(items[0].uri),
														})}
														class="flex h-10 items-center gap-3 px-4 hover:bg-hinted"
													>
														<div class="flex h-full w-10 justify-center">
															<div class="mt-3 border-l-2 border-dashed border-divider" />
														</div>
														<span class="text-sm text-accent">Show parent post</span>
													</a>
												)}

												{items.map((item) => {
													if ('$type' in item) {
														return (
															<div class="p-3">
																{item.$type === 'app.bsky.feed.defs#notFoundPost' ? (
																	<EmbedRecordNotFound />
																) : item.$type === 'app.bsky.feed.defs#blockedPost' ? (
																	<EmbedRecordBlocked
																		uid={uid()}
																		record={{
																			$type: 'app.bsky.embed.record#viewBlocked',
																			uri: item.uri,
																			blocked: item.blocked,
																			author: item.author,
																		}}
																	/>
																) : null}
															</div>
														);
													}

													return (
														<VirtualContainer id={createPostKey(item.cid.value, false, true)}>
															<Post interactive uid={uid()} post={item} prev next />
														</VirtualContainer>
													);
												})}
											</>
										);
									}}
								</Show>

								<div ref={focusRef} class="scroll-m-16 px-4 pt-3">
									<div class="mb-1 flex items-center gap-3 -mx-1 md:mx-0">
										<a
											link
											href={generatePath('/u/:uid/profile/:actor', { uid: uid(), actor: author.did })}
											class="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted-fg hover:opacity-80"
										>
											<Show when={author.avatar.value}>
												{(avatar) => <img src={avatar()} class="h-full w-full" />}
											</Show>
										</a>

										<a
											link
											href={generatePath('/u/:uid/profile/:actor', { uid: uid(), actor: author.did })}
											class="flex flex-col text-sm"
										>
											<span dir="auto" class="line-clamp-1 break-all hover:underline text-[15px] font-bold leading-4.5">
												{author.displayName.value || author.handle.value}
											</span>
											<span class="line-clamp-1 break-all text-muted-fg text-[15px] font-normal leading-4">@{author.handle.value}</span>
										</a>

										<div class="flex shrink-0 grow justify-end">
											<button
												onClick={() => {
													openModal(() => (
														<PostMenu
															uid={uid()}
															post={post}
															onTranslate={() => setSearchParams({ tl: 'y' }, { replace: true })}
														/>
													));
												}}
												class="-mx-2 -my-1.5 flex h-8 w-8 items-center justify-center rounded-full text-base text-muted-fg xl:hover:bg-cyan-600/20 xl:hover:text-cyan-600/80"
											>
												<MoreHorizIcon />
											</button>
										</div>
									</div>
									
									<div class="-mx-1 md:mx-0">
										<PostContent
											uid={uid}
											post={post}
											searchParams={searchParams}
											onTranslate={() => setSearchParams({ tl: 'y' }, { replace: true })}
										/>
									</div>

									<Show
										when={(() => {
											const $tags = record().tags;
											if ($tags && $tags.length > 0) {
												return $tags;
											}
										})()}
									>
										{(tags) => (
											<div class="my-3 flex flex-wrap gap-2 text-sm -mx-1 md:mx-0">
												<For each={tags()}>
													{(tag) => (
														<a
															link
															href={`/u/${uid()}/explore/search?t=post&q=${encodeURIComponent(tag)}`}
															class="max-w-full break-words text-muted-fg hover:underline"
														>
															#{tag}
														</a>
													)}
												</For>
											</div>
										)}
									</Show>

									<div class="my-3 -mx-1 md:mx-0">
										<span class="text-[14px] text-muted-fg">
											{relformat.formatAbsWithTime(record().createdAt)}
										</span>
									</div>

									<hr class={post.repostCount.value === 0 && post.likeCount.value === 0 ? "hidden" : "border-divider"} />

									<div class={post.repostCount.value === 0 && post.likeCount.value === 0 ? "hidden" : "flex flex-wrap gap-4 py-3 text-sm -mx-1 md:mx-0"}>
										<a
											link
											href={post.repostCount.value === 0 ? undefined : generatePath('/u/:uid/profile/:actor/post/:status/reposts', params)}
											class={post.repostCount.value === 0 ? "hidden" : "hover:underline"}
											>
											{post.repostCount.value !== 0 && (
												<>
												<span class="font-bold">{comformat.format(post.repostCount.value)}</span>{' '}
												<span class="text-muted-fg">Reposts</span>
												</>
											)}
										</a>
										<a
											link
											href={post.likeCount.value === 0 ? undefined : generatePath('/u/:uid/profile/:actor/post/:status/likes', params)}
											class={post.likeCount.value === 0 ? "hidden" : "hover:underline"}
											>
											{post.likeCount.value !== 0 && (
												<>
												<span class="font-bold">{comformat.format(post.likeCount.value)}</span>{' '}
												<span class="text-muted-fg">likes</span>
												</>
											)}
										</a>
									</div>

									<hr class="border-divider" />

									<div class="flex h-11 items-center justify-around text-muted-fg -mx-4">
										<a
											link
											href={`/u/${uid()}/compose?reply=${encodeURIComponent(post.uri)}`}
											class="flex h-9 w-9 items-center justify-center rounded-full text-xl xl:hover:bg-cyan-600/20 xl:hover:text-cyan-600/80"
										>
											<ChatBubbleOutlinedIcon />
										</a>

										<button
											class="flex h-9 w-9 items-center justify-center rounded-full text-xl xl:hover:bg-green-600/20 xl:hover:text-green-600/80"
											classList={{
												'text-green-600': !!post.viewer.repost.value,
											}}
											onClick={() => {
												openModal(() => <PostRepostMenu uid={uid()} post={post} />);
											}}
										>
											<RepeatIcon class="scale-110"/>
										</button>

										<button
											class="group flex h-9 w-9 items-center justify-center rounded-full text-xl xl:hover:bg-red-600/20 xl:hover:text-red-600/80"
											classList={{ 'is-active text-red-600': !!post.viewer.like.value }}
											onClick={() => favoritePost(uid(), post)}
										>
											<FavoriteOutlinedIcon class="group-[.is-active]:hidden" />
											<FavoriteIcon class="hidden group-[.is-active]:block" />
										</button>

										<button
											class="flex h-9 w-9 items-center justify-center rounded-full text-xl xl:hover:bg-cyan-600/20 xl:hover:text-cyan-600/80"
											onClick={() => {
												openModal(() => <PostShareMenu post={post} />);
											}}
										>
											<ShareIcon />
										</button>
									</div>
								</div>

								<hr class="border-divider" />

								<For each={data.descendants}>
									{(slice) => {
										let overflowing = false;
										let items = slice.items;
										let len = items.length;

										if (len > MAX_DESCENDANTS) {
											overflowing = true;
											items = items.slice(0, MAX_DESCENDANTS) as any;
											len = MAX_DESCENDANTS;
										}

										return (
											<>
												{items.map((item, idx) => {
													if ('$type' in item) {
														return (
															<div class="border-b border-divider p-3">
																{item.$type === 'app.bsky.feed.defs#blockedPost' ? (
																	<EmbedRecordBlocked
																		uid={uid()}
																		record={{
																			$type: 'app.bsky.embed.record#viewBlocked',
																			uri: item.uri,
																			blocked: item.blocked,
																			author: item.author,
																		}}
																	/>
																) : null}
															</div>
														);
													}

													return (
														<VirtualContainer
															estimateHeight={98.8}
															id={createPostKey(item.cid.value, false, overflowing || idx !== len - 1)}
														>
															<Post
																interactive
																uid={uid()}
																post={item}
																prev
																next={overflowing || idx !== len - 1}
															/>
														</VirtualContainer>
													);
												})}

												{overflowing && (
													<a
														link
														href={generatePath('/u/:uid/profile/:actor/post/:status', {
															uid: uid(),
															actor: getRepoId(items[len - 1].uri),
															status: getRecordId(items[len - 1].uri),
														})}
														class="flex h-10 items-center gap-3 border-b border-divider px-3 hover:bg-hinted"
													>
														<div class="flex h-full w-10 justify-center">
															<div class="mb-3 border-l-2 border-dashed border-divider" />
														</div>
														<span class="text-sm text-accent">Continue thread</span>
													</a>
												)}
											</>
										);
									}}
								</For>

								<div class="flex h-13 items-center justify-center">
									<span class="text-sm text-muted-fg">End of thread</span>
								</div>
								<div class="h-[30dvh]"></div>
							</>
						);
					}}
				</Match>

				<Match when>
					<div class="flex h-13 items-center justify-center">
						<CircularProgress />
					</div>
				</Match>
			</Switch>
		</div>
	);
};

export default AuthenticatedPostPage;

// <PostContent />
interface PostContentProps {
	uid: Accessor<DID>;
	post: SignalizedPost;
	searchParams: PageSearchParams;
	onTranslate?: () => void;
	force?: boolean;
}

const PostContent = ({ uid, post, searchParams, onTranslate, force }: PostContentProps) => {
	const mod = post.$mod();

	if (!force && mod?.b && mod.s.t === CauseLabel) {
		const [show, setShow] = createSignal(false);

		const source = mod.s;
		const title = `Content warning: ${source.l.val}`;

		return (
			<>
				<div class="mt-3 flex items-stretch justify-between gap-3 overflow-hidden rounded-2xl border border-divider">
					<p class="m-3 text-sm text-muted-fg">{title}</p>

					<button
						onClick={() => setShow(!show())}
						class="px-4 text-sm font-medium hover:bg-secondary hover:text-hinted-fg"
					>
						{show() ? 'Hide' : 'Show'}
					</button>
				</div>

				<Show when={show()}>
					<PostContent uid={uid} post={post} searchParams={searchParams} onTranslate={onTranslate} force />
				</Show>
			</>
		);
	}

	const needTranslation = createMemo(() => {
		const $record = post.record.value;
		const langs = $record.langs;

		if (!langs || !$record.text || langs.length < 1) {
			return false;
		}

		const $prefs = getAccountPreferences(uid());
		const preferred = $prefs.ct_language ?? 'system';

		if (preferred === 'none') {
			return false;
		}

		const preferredLang = preferred === 'system' ? systemLanguages[0] : preferred;
		const exclusions = unwrap($prefs.ct_exclusions);

		const unknowns = langs.filter(
			(code) => code !== preferredLang && (!exclusions || !exclusions.includes(code)),
		);

		return unknowns.length > 0;
	});

	const preferredLanguage = () => {
		const $prefs = getAccountPreferences(uid());
		const preferred = $prefs.ct_language ?? 'system';

		const preferredLang = preferred === 'system' || preferred === 'none' ? systemLanguages[0] : preferred;
		return preferredLang;
	};

	return (
		<>
			<Show when={post.$deleted.value}>
				<div class="mt-3 text-sm text-muted-fg">This post has been deleted.</div>
			</Show>

			<div class="mt-2 md:mt-3 whitespace-pre-wrap break-words text-[18px] md:text-[17px] font-normal leading-[25px] md:leading-6 empty:hidden">{post.$renderedContent()}</div>

			<Switch>
				<Match when={searchParams.tl === 'y'}>
					<PostTranslation text={post.record.value.text} target={preferredLanguage()} />
				</Match>

				<Match when={needTranslation()}>
					<button onClick={onTranslate} class="mt-1 text-sm text-accent hover:underline">
						Translate post
					</button>
				</Match>
			</Switch>

			<Show when={post.embed.value}>{(embed) => <PostEmbedContent uid={uid} embed={embed} mod={mod} />}</Show>
		</>
	);
};

// <PostEmbedContent />
interface PostEmbedContentProps {
	uid: Accessor<DID>;
	mod?: ModerationDecision | null;
	embed: Accessor<NonNullable<RefOf<'app.bsky.feed.defs#postView'>['embed']>>;
	force?: boolean;
}

const PostEmbedContent = ({ uid, mod, embed, force }: PostEmbedContentProps) => {
	if (!force && mod?.m) {
		const [show, setShow] = createSignal(false);

		const source = mod.s;
		const title = `Media warning${source.t === CauseLabel ? `: ${source.l.val}` : ''}`;

		return (
			<>
				<div class="mt-3 flex items-stretch justify-between gap-3 overflow-hidden rounded-2xl border border-divider">
					<p class="m-3 text-sm text-muted-fg">{title}</p>

					<button
						onClick={() => setShow(!show())}
						class="px-4 text-sm font-medium hover:bg-secondary hover:text-hinted-fg"
					>
						{show() ? 'Hide' : 'Show'}
					</button>
				</div>

				<Show when={show()}>
					<PostEmbedContent uid={uid} embed={embed} force />
				</Show>
			</>
		);
	}

	return <Embed uid={uid()} embed={embed()} large/>;
};
