import { For, Match, Switch, createMemo } from 'solid-js';

import type { DID } from '@intrnl/bluesky-client/atp-schema';
import { createQuery } from '@intrnl/sq';

import { getInviteCodes, getInviteCodesKey } from '~/api/queries/get-invite-codes.ts';

import { openModal } from '~/globals/modals.tsx';
import { useParams } from '~/router.ts';
import { Title } from '~/utils/meta.tsx';
import * as relformat from '~/utils/intl/relformatter.ts';

import CircularProgress from '~/components/CircularProgress.tsx';
import ContentCopyIcon from '~/icons/baseline-content-copy.tsx';
import PeopleIcon from '~/icons/baseline-people.tsx';

import InvitedUsersDialog from './InvitedUsersDialog.tsx';

import ArrowLeftIcon from '~/icons/baseline-arrow-left.tsx';

const AuthenticatedInviteCodesPage = () => {
	const params = useParams('/u/:uid/you/invites');

	const uid = () => params.uid as DID;

	const [inviteCodes] = createQuery({
		key: () => getInviteCodesKey(uid()),
		fetch: getInviteCodes,
		staleTime: 5_000,
	});

	const handleGoBack = () => {
		window.history.go(-1); // Go back one step in browser history
	};

	return (
		<div class="flex flex-col">
			<Title render={`Invite codes / Langit`} />

			<div class="sticky top-0 z-10 flex h-13 items-center border-b border-divider bg-background/70 backdrop-blur-md px-4">
				<button onClick={handleGoBack} class="text-base font-bold mr-3 p-3 -ml-3"><ArrowLeftIcon/></button>
				<p class="text-base font-bold leading-5">Invite codes</p>
			</div>

			<Switch>
				<Match when={inviteCodes()}>
					{(data) => {
						const invites = () => data().codes;

						const availableCount = createMemo(() => {
							const array = invites();
							let count = 0;

							for (let idx = 0, len = array.length; idx < len; idx++) {
								const code = array[idx];

								if (code.available - code.uses.length <= 0 || code.disabled) {
									continue;
								}

								count += 1;
							}

							return count;
						});

						return (
							<div>
								<p class="border-b border-divider p-4 text-sm">
									You have <span class="font-bold">{availableCount()}</span> invite codes remaining.
								</p>

								<For each={invites()}>
									{(invite) => {
										const used = invite.available - invite.uses.length <= 0 || invite.disabled;

										return (
											<div class="flex items-center gap-4 border-b border-divider p-4">
												<div class="grow text-sm">
													<p class="font-bold" classList={{ 'line-through': used }}>
														{invite.code}
													</p>

													<Switch>
														<Match when={invite.disabled}>
															<p class="text-muted-fg">Invite code disabled</p>
														</Match>
														<Match when>
															<p class="text-muted-fg">
																<span>
																	Used {invite.uses.length}/{invite.available} times
																</span>
																<span class="px-1">·</span>
																<span>{relformat.formatAbs(invite.createdAt)}</span>
															</p>
														</Match>
													</Switch>
												</div>

												<div class="-mr-2 flex gap-2">
													<button
														title="View invited users"
														onClick={() => {
															openModal(() => <InvitedUsersDialog uid={uid()} invite={invite} />);
														}}
														class="flex h-9 w-9 items-center justify-center rounded-full text-xl hover:bg-secondary"
													>
														<PeopleIcon />
													</button>

													<button
														title="Copy invite code"
														onClick={() => navigator.clipboard.writeText(invite.code)}
														class="flex h-9 w-9 items-center justify-center rounded-full text-xl hover:bg-secondary"
													>
														<ContentCopyIcon />
													</button>
												</div>
											</div>
										);
									}}
								</For>
							</div>
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

export default AuthenticatedInviteCodesPage;
