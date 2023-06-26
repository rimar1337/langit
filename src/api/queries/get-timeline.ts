import { type EnhancedResource, type QueryFn } from '~/lib/solid-query/index.ts';

import { multiagent } from '~/globals/agent.ts';
import { systemLanguages } from '~/globals/platform.ts';
import { preferences } from '~/globals/preferences.ts';
import { assert } from '~/utils/misc.ts';

import {
	type PostFilter,
	type SliceFilter,
	type TimelineSlice,
	createTimelineSlices,
} from '../models/timeline.ts';

import { type Agent } from '../agent.ts';
import {
	type BskyLikeRecord,
	type BskyListRecordsResponse,
	type BskyPost,
	type BskyTimelineResponse,
} from '../types.ts';
import { type Collection, type DID, pushCollection } from '../utils.ts';

import _getDid from './_did.ts';
import { fetchPost } from './get-post.ts';

export interface HomeTimelineParams {
	type: 'home';
	algorithm: 'reverse-chronological' | (string & {});
}

export interface CustomTimelineParams {
	type: 'custom';
	uri: string;
}

export interface ProfileTimelineParams {
	type: 'profile';
	actor: string;
	tab: 'posts' | 'replies' | 'likes';
}

export type FeedParams = HomeTimelineParams | CustomTimelineParams | ProfileTimelineParams;

export interface FeedPage {
	cursor?: string;
	cid?: string;
	slices: TimelineSlice[];
	remainingSlices: TimelineSlice[];
}

export interface FeedLatestResult {
	cid: string | undefined;
}

export type FeedResource = EnhancedResource<Collection<FeedPage>, string>;
export type FeedLatestResource = EnhancedResource<FeedLatestResult>;

//// Feed query
// How many attempts it should try looking for more items before it gives up on empty pages.
const MAX_EMPTY = 3;

const MAX_POSTS = 15;

const countPosts = (slices: TimelineSlice[], limit?: number) => {
	let count = 0;

	let idx = 0;
	let len = slices.length;

	for (; idx < len; idx++) {
		const slice = slices[idx];
		count += slice.items.length;

		if (limit !== undefined && count > limit) {
			return idx;
		}
	}

	if (limit !== undefined) {
		return len;
	}

	return count;
};

export const getTimelineKey = (uid: DID, params: FeedParams, limit = MAX_POSTS) => {
	return ['getFeed', uid, params, limit] as const;
};
export const getTimeline: QueryFn<Collection<FeedPage>, ReturnType<typeof getTimelineKey>, string> = async (
	key,
	{ data: prevData, param: prevCursor },
) => {
	const [, uid, params, limit] = key;
	const type = params.type;

	const agent = await multiagent.connect(uid);

	// used for profiles
	let _did: DID;

	let cursor = prevCursor;
	let empty = 0;
	let cid: string | undefined;

	let slices: TimelineSlice[];
	let count = 0;

	let sliceFilter: SliceFilter | undefined;
	let postFilter: PostFilter | undefined;

	if (cursor && prevData) {
		const pages = prevData.pages;
		const last = pages[pages.length - 1];

		slices = last.remainingSlices;
		count = countPosts(slices);
	} else {
		slices = [];
	}

	if (type === 'home') {
		sliceFilter = createHomeSliceFilter(uid);
	} else if (type === 'custom') {
		postFilter = createFeedPostFilter(uid);
	} else if (type === 'profile') {
		_did = await _getDid(agent, params.actor);

		if (params.tab !== 'likes') {
			sliceFilter = createProfileSliceFilter(_did, params.tab === 'replies');
		}
	}

	while (count < limit) {
		const timeline = await fetchPage(agent, params, limit, cursor, _did!);

		const feed = timeline.feed;
		const result = createTimelineSlices(feed, sliceFilter, postFilter);

		cursor = timeline.cursor;
		empty = result.length > 0 ? 0 : empty + 1;
		slices = slices.concat(result);

		count += countPosts(result);

		cid ||= feed.length > 0 ? feed[0].post.cid : undefined;

		if (!cursor || empty >= MAX_EMPTY) {
			break;
		}
	}

	// we're still slicing by the amount of slices and not amount of posts
	const remainingSlices = slices.splice(countPosts(slices, limit) + 1, slices.length);

	const page: FeedPage = {
		cursor,
		cid,
		slices,
		remainingSlices,
	};

	return pushCollection(prevData, page, prevCursor);
};

/// Latest feed query
export const getTimelineLatestKey = (uid: DID, params: FeedParams) => {
	return ['getFeedLatest', uid, params] as const;
};
export const getTimelineLatest: QueryFn<FeedLatestResult, ReturnType<typeof getTimelineLatestKey>> = async (
	key,
) => {
	const [, uid, params] = key;

	const agent = await multiagent.connect(uid);

	if (params.type === 'profile' && params.tab === 'likes') {
		const did = await _getDid(agent, params.actor);

		const response = await agent.rpc.get<BskyListRecordsResponse<BskyLikeRecord>>({
			method: 'com.atproto.repo.listRecords',
			params: {
				collection: 'app.bsky.feed.like',
				repo: did,
				limit: 1,
			},
		});

		const records = response.data.records;

		return { cid: records.length > 0 ? records[0].cid : undefined };
	} else {
		const timeline = await fetchPage(agent, params, 1, undefined, undefined);
		const feed = timeline.feed;

		return { cid: feed.length > 0 ? feed[0].post.cid : undefined };
	}
};

//// Raw fetch
const fetchPage = async (
	agent: Agent,
	params: FeedParams,
	limit: number,
	cursor: string | undefined,
	_did: DID | undefined,
): Promise<BskyTimelineResponse> => {
	const type = params.type;

	if (type === 'home') {
		const response = await agent.rpc.get<BskyTimelineResponse>({
			method: 'app.bsky.feed.getTimeline',
			params: { algorithm: params.algorithm, cursor, limit },
		});

		return response.data;
	} else if (type === 'custom') {
		const response = await agent.rpc.get<BskyTimelineResponse>({
			method: 'app.bsky.feed.getFeed',
			params: { feed: params.uri, cursor, limit },
		});

		return response.data;
	} else if (type === 'profile') {
		if (params.tab === 'likes') {
			const response = await agent.rpc.get<BskyListRecordsResponse<BskyLikeRecord>>({
				method: 'com.atproto.repo.listRecords',
				params: {
					collection: 'app.bsky.feed.like',
					repo: _did!,
					cursor,
					limit,
				},
			});

			const data = response.data;
			const postUris = data.records.map((record) => record.value.subject.uri);

			const uid = agent.session.peek()!.did;
			const queries = await Promise.allSettled(postUris.map((uri) => fetchPost([uid, uri])));

			return {
				cursor: data.cursor,
				feed: queries
					.filter((result): result is PromiseFulfilledResult<BskyPost> => result.status === 'fulfilled')
					.map((result) => ({ post: result.value })),
			};
		} else {
			const response = await agent.rpc.get<BskyTimelineResponse>({
				method: 'app.bsky.feed.getAuthorFeed',
				params: { actor: params.actor, cursor, limit },
			});

			return response.data;
		}
	} else {
		assert(false, `Unknown type: ${type}`);
	}
};

//// Feed filters
const createHomeSliceFilter = (uid: DID): SliceFilter | undefined => {
	return (slice) => {
		const items = slice.items;
		const first = items[0];

		// skip any posts that are in reply to non-followed
		if (first.reply && (!first.reason || first.reason.$type !== 'app.bsky.feed.defs#reasonRepost')) {
			const root = first.reply.root;
			const parent = first.reply.parent;

			if (
				(root.author.did !== uid && !root.author.viewer.following.peek()) ||
				(parent.author.did !== uid && !parent.author.viewer.following.peek())
			) {
				return false;
			}
		} else if (first.post.record.peek().reply) {
			return false;
		}

		return true;
	};
};

const createFeedPostFilter = (uid: DID): PostFilter | undefined => {
	const pref = preferences.get(uid);

	const allowUnspecified = pref?.cl_unspecified ?? true;
	let languages = pref?.cl_codes;

	if (pref?.cl_systemLanguage ?? true) {
		languages = languages ? systemLanguages.concat(languages) : systemLanguages;
	}

	if (!languages || languages.length < 1) {
		return undefined;
	}

	return (item) => {
		const record = item.post.record;
		const langs = record.langs;

		if (!record.text) {
			return true;
		}

		if (!langs) {
			return allowUnspecified;
		}

		return langs.some((code) => languages!.includes(code));
	};
};

const createProfileSliceFilter = (did: DID, replies: boolean): SliceFilter | undefined => {
	return (slice) => {
		const items = slice.items;
		const first = items[0];

		if (!replies && (!first.reason || first.reason.$type !== 'app.bsky.feed.defs#reasonRepost')) {
			const reply = first.reply;

			if (reply) {
				const root = reply.root;
				const parent = reply.parent;

				return root.author.did === did && parent.author.did === did;
			} else if (first.post.record.peek().reply) {
				return false;
			}
		}

		return true;
	};
};
