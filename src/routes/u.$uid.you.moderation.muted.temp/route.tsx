import { For, Show, Suspense, SuspenseList, createMemo } from 'solid-js';

import type { DID } from '@intrnl/bluesky-client/atp-schema';
import { createQuery } from '@intrnl/sq';
import { useNavigate } from '@solidjs/router';

import { mergeSignalizedProfile, type SignalizedProfile } from '~/api/cache/profiles.ts';
import { getInitialProfile, getProfileKey } from '~/api/queries/get-profile.ts';
import { fetchProfileBatched } from '~/api/queries/get-profile-batched.ts';

import { getAccountPreferences } from '~/globals/preferences.ts';
import { generatePath, useParams } from '~/router.ts';
import { Title } from '~/utils/meta.tsx';
import { INTERACTION_TAGS, isElementAltClicked, isElementClicked } from '~/utils/misc.ts';
import * as relformat from '~/utils/intl/relformatter.ts';

import CircularProgress from '~/components/CircularProgress.tsx';
import VirtualContainer from '~/components/VirtualContainer.tsx';
import ArrowLeftIcon from '~/icons/baseline-arrow-left';

const AuthenticatedTempMutedUsersModerationPage = () => {
	const params = useParams('/u/:uid/you/moderation/muted/temp');

	const navigate = useNavigate();

	const uid = () => params.uid as DID;

	const mutedUsersDict = createMemo(() => {
		const $prefs = getAccountPreferences(uid());
		const tempMutes = $prefs.pf_tempMutes;

		return tempMutes || {};
	});

	const users = createMemo(() => {
		const $dict = mutedUsersDict();

		const now = Date.now();
		const arr: DID[] = [];

		for (const did in $dict) {
			const val = $dict[did as DID];

			if (val != null && now < val) {
				arr.push(did as DID);
			}
		}

		return arr;
	});

	const handleGoBack = () => {
		window.history.go(-1); // Go back one step in browser history
	};

	return (
		<div class="flex flex-col">
			<Title render={`Temporarily muted users / Langit`} />

			<div class="sticky top-0 z-10 flex h-13 items-center border-b border-divider bg-background px-4">
				<button onClick={handleGoBack} class="text-base font-bold mr-3 p-3 -ml-3"><ArrowLeftIcon/></button>
				<p class="text-base font-bold">Temporarily muted users</p>
			</div>

			<SuspenseList revealOrder="forwards" tail="collapsed">
				<For
					each={users()}
					fallback={<div class="p-4 text-sm text-muted-fg">You don't have any temporarily muted users</div>}
				>
					{(actor) => {
						const date = () => mutedUsersDict()[actor]!;

						const [profile] = createQuery<SignalizedProfile, ReturnType<typeof getProfileKey>>({
							key: () => getProfileKey(uid(), actor),
							fetch: async ([, uid, actor]) => {
								const response = await fetchProfileBatched([uid, actor as DID]);
								const profile = mergeSignalizedProfile(uid, response);

								return profile;
							},
							initialData: getInitialProfile,
							refetchOnMount: false,
							refetchOnReconnect: false,
							refetchOnWindowFocus: false,
						});

						const handleClick = (ev: MouseEvent | KeyboardEvent) => {
							if (!isElementClicked(ev, INTERACTION_TAGS)) {
								return;
							}

							const path = generatePath('/u/:uid/profile/:actor', {
								uid: uid(),
								actor: profile()!.did,
							});

							if (isElementAltClicked(ev)) {
								open(path, '_blank');
							} else {
								navigate(path);
							}
						};

						return (
							<Suspense
								fallback={
									<div class="flex h-13 items-center justify-center border-divider">
										<CircularProgress />
									</div>
								}
							>
								<VirtualContainer id={/* @once */ `profile/${profile()?.did}/mt`} estimateHeight={88}>
									<div
										onClick={handleClick}
										onAuxClick={handleClick}
										onKeyDown={handleClick}
										role="button"
										tabindex={0}
										class="flex gap-3 px-4 py-3 hover:bg-hinted"
									>
										<div class="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted-fg">
											<Show when={profile()?.avatar.value}>
												{(avatar) => <img src={avatar()} class="h-full w-full" />}
											</Show>
										</div>

										<div class="flex min-w-0 grow flex-col gap-1">
											<div class="flex items-center justify-between gap-3">
												<div class="flex flex-col text-sm">
													<span class="line-clamp-1 break-all font-bold">
														{profile()?.displayName.value || profile()?.handle.value}
													</span>
													<span class="line-clamp-1 break-all text-muted-fg">@{profile()?.handle.value}</span>
												</div>
											</div>

											<Show when={profile()?.description.value}>
												<div class="line-clamp-3 break-words text-sm">
													{profile()?.$renderedDescription()}
												</div>
											</Show>

											<p class="text-sm text-muted-fg">
												Muted until <span class="font-bold">{relformat.formatAbsWithTime(date())}</span>
											</p>
										</div>
									</div>
								</VirtualContainer>
							</Suspense>
						);
					}}
				</For>

				<Show when={users().length > 0}>
					<Suspense>
						<div class="flex h-13 items-center justify-center">
							<p class="text-sm text-muted-fg">End of list</p>
						</div>
					</Suspense>
				</Show>
			</SuspenseList>
		</div>
	);
};

export default AuthenticatedTempMutedUsersModerationPage;
