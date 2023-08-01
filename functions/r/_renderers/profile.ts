import { escape, getBlobUrl } from '../_global.ts';
import { resolveProfile, resolveRepository } from '../_resolvers.ts';

import { renderBase } from './base.ts';

export const renderProfile = async (actor: string) => {
	const repo = await resolveRepository(actor);
	const profile = await resolveProfile(repo.did);

	const title = profile?.displayName ? `${profile.displayName} (@${repo.handle})` : `@${repo.handle}`;

	let head = renderBase();
	head += `<meta property="og:title" content="${escape(title, true)}" />`;

	if (profile) {
		const avatar = profile.avatar;
		const description = profile.description;

		if (avatar) {
			const url = getBlobUrl(repo.did, avatar);

			head += `<meta property="og:image" content="${escape(url, true)}" />`;
		}
		if (description) {
			head += `<meta property="og:description" content="${escape(description, true)}" />`;
		}
	}

	return head;
};