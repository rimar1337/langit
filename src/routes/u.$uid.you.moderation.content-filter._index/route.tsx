import { For, createMemo } from 'solid-js';
import type { DID } from '@intrnl/bluesky-client/atp-schema';

import { generatePath, useParams } from '~/router.ts';
import { Title } from '~/utils/meta.tsx';
import { openModal } from '~/globals/modals.tsx';
import { getAccountModerationPreferences } from '~/globals/preferences.ts';

import AddIcon from '~/icons/baseline-add.tsx';
import VisibilityIcon from '~/icons/baseline-visibility.tsx';

import { LABELERS } from './types.ts';
import AddLabelerDialog from './AddLabelerDialog.tsx';
import ArrowLeftIcon from '~/icons/baseline-arrow-left.tsx';

const AuthenticatedContentFilterModerationPage = () => {
	const params = useParams('/u/:uid/you/moderation/content-filter');

	const uid = () => params.uid as DID;

	const prefs = createMemo(() => {
		return getAccountModerationPreferences(uid());
	});

	const enabledLabelers = createMemo(() => {
		const $prefs = prefs().labelers;
		return LABELERS.filter((labeler) => $prefs[labeler.did]);
	});

	const handleGoBack = () => {
		window.history.go(-1); // Go back one step in browser history
	};

	return (
		<div class="flex flex-col">
			<Title render={`Content filters / Langit`} />

			<div class="sticky top-0 z-10 flex h-13 items-center border-b border-divider bg-background px-4">
				<button onClick={handleGoBack} class="text-base font-bold mr-3 p-3 -ml-3"><ArrowLeftIcon/></button>
				<p class="text-base font-bold">Content filters</p>
			</div>

			<a
				link
				href={generatePath('/u/:uid/you/moderation/content-filter/global', params)}
				class="my-2 flex items-center gap-4 px-4 py-3 text-sm hover:bg-hinted"
			>
				<VisibilityIcon class="text-2xl" />
				<span>Global content filters</span>
			</a>

			<hr class="border-divider" />

			{/* <p class="p-4 text-base font-bold leading-5">Self-labeled content</p>

			<p class="px-4 pb-3 text-[0.8125rem] text-muted-fg">
				Adds filter overrides for posts that have been labeled by the author themselves.
			</p>

			<button class="flex items-center gap-4 px-4 py-3 text-sm hover:bg-hinted">
				<AddIcon class="text-2xl" />
				<span>Add user override</span>
			</button>

			<hr class="mt-2 border-divider" /> */}

			<p class="p-4 text-base font-bold leading-5">Label providers</p>

			<p class="px-4 pb-3 text-[0.8125rem] text-muted-fg">
				Label providers are communities or instances aiming to provide a better social experience by labeling
				the content that you see in Bluesky.
			</p>

			<button
				onClick={() => {
					openModal(() => (
						<AddLabelerDialog
							uid={uid()}
							onPick={(labeler) => {
								const $prefs = prefs();
								$prefs.labelers[labeler.did] = { groups: {}, labels: {} };
							}}
						/>
					));
				}}
				class="flex items-center gap-4 px-4 py-3 text-sm hover:bg-hinted"
			>
				<AddIcon class="text-2xl" />
				<span>Add label provider</span>
			</button>

			<For each={enabledLabelers()}>
				{(labeler) => (
					<a
						link
						href={generatePath('/u/:uid/you/moderation/content-filter/labeler/:labeler', {
							uid: uid(),
							labeler: labeler.did,
						})}
						class="flex items-center gap-3 px-4 py-3 text-left hover:bg-hinted"
					>
						<div class="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted-fg"></div>

						<div class="min-w-0 grow">
							<p class="break-words text-sm font-bold">{labeler.name}</p>
							<p class="text-sm text-muted-fg">@{labeler.handle}</p>
						</div>
					</a>
				)}
			</For>
		</div>
	);
};

export default AuthenticatedContentFilterModerationPage;
