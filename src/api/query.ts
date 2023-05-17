import { QueryFunctionContext } from '@tanstack/solid-query';

import { multiagent } from './global.ts';
import { type UID } from './multiagent.ts';

import { createTimelinePage } from '~/models/timeline.ts';
import { type BskyProfile, type BskyTimeline } from './types.ts';

export const getProfileKey = (uid: UID, handle: string) => ['getProfile', uid, handle] as const;
export const getProfile = async (ctx: QueryFunctionContext<ReturnType<typeof getProfileKey>>) => {
	const [, uid, handle] = ctx.queryKey;
	const agent = await multiagent.connect(uid);

	const res = await agent.rpc.get({
		method: 'app.bsky.actor.getProfile',
		signal: ctx.signal,
		params: {
			actor: handle,
		},
	});

	return res.data as BskyProfile;
};

export const getTimelineKey = (uid: UID, algorithm: string) => ['getTimeline', uid, algorithm] as const;
export const createTimelineQuery = (limit: number) => {
	return async (ctx: QueryFunctionContext<ReturnType<typeof getTimelineKey>>) => {
		const [, uid, algorithm] = ctx.queryKey;

		const session = multiagent.accounts[uid].session;
		const agent = await multiagent.connect(uid);

		const response = await agent.rpc.get({
			method: 'app.bsky.feed.getTimeline',
			params: { algorithm, cursor: ctx.pageParam, limit },
		});

		const data = response.data as BskyTimeline;
		const page = createTimelinePage(data, session.did);

		return page;
	};
};

export const getTimelineLatestKey = (uid: UID, algorithm: string) => ['getTimelineLatest', uid, algorithm] as const;
export const createTimelineLatestQuery = (limit: number) => {
	return async (ctx: QueryFunctionContext<ReturnType<typeof getTimelineLatestKey>>) => {
		const [, uid, algorithm] = ctx.queryKey;

		const session = multiagent.accounts[uid].session;
		const agent = await multiagent.connect(uid);

		const response = await agent.rpc.get({
			method: 'app.bsky.feed.getTimeline',
			params: { algorithm, limit },
		});

		const data = response.data as BskyTimeline;
		const page = createTimelinePage(data, session.did);

		if (page.slices.length > 0) {
			return page.slices[0].items[0].post.peek().cid;
		}

		return null;
	};
};
