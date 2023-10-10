import { ErrorBoundary, Show, createEffect } from 'solid-js';

import type { DID } from '@intrnl/bluesky-client/atp-schema';
import { XRPCError } from '@intrnl/bluesky-client/xrpc-utils';
import { createQuery } from '@intrnl/sq';
import { A, Navigate, Outlet, useLocation } from '@solidjs/router';

import { type MultiagentProfileData, MultiagentError } from '~/api/multiagent.ts';

import { getNotificationsLatest, getNotificationsLatestKey } from '~/api/queries/get-notifications.ts';
import { getProfile, getProfileKey } from '~/api/queries/get-profile.ts';

import { getAccountData, multiagent } from '~/globals/agent.ts';
import { openModal } from '~/globals/modals.tsx';
import { generatePath, useParams } from '~/router.ts';
import { parseStackTrace } from '~/utils/errorstacks.ts';
import { useMediaQuery } from '~/utils/media-query.ts';

import button from '~/styles/primitives/button.ts';

import AddBoxIcon from '~/icons/baseline-add-box.tsx';
import ExploreIcon from '~/icons/baseline-explore.tsx';
import HomeIcon from '~/icons/baseline-home.tsx';
import NotificationsIcon from '~/icons/baseline-notifications.tsx';
import AddBoxOutlinedIcon from '~/icons/outline-add-box.tsx';
import ExploreOutlinedIcon from '~/icons/outline-explore.tsx';
import HomeOutlinedIcon from '~/icons/outline-home.tsx';
import NotificationsOutlinedIcon from '~/icons/outline-notifications.tsx';

import AccountCircleIcon from '~/icons/baseline-account-circle.tsx';
import AccountCircleOutlinedIcon from '~/icons/outline-account-circle.tsx';

import InvalidSessionNoticeDialog from './InvalidSessionNoticeDialog.tsx';

import { isUpdateReady, updateSW } from '~/utils/service-worker.ts';
import AddIcon from '~/icons/baseline-add.tsx';

const handleError = (error: any, reset: () => void) => {
	const parseFileName = (file: string) => {
		try {
			const url = new URL(file);

			if (url.host === location.host) {
				return url.pathname + url.search;
			}
		} catch {}

		return file;
	};

	const renderError = (error: any) => {
		console.error(`Caught error:`, error);

		if (error instanceof Error) {
			const frames = parseStackTrace(error.stack);

			const renderedFrames = frames
				.map(({ fileName: file, name, line, column }) => {
					return `  at ${parseFileName(file)} @ ${name || '<unknown>'} (${line}:${column})`;
				})
				.join('\n');

			return `${error.name}: ${error.message}\n${renderedFrames}`;
		}

		return '' + error + '\nThis thrown value is not of an Error object!';
	};

	return (
		<div class="p-4">
			<h1 class="mb-4 font-bold">Something went wrong</h1>

			<pre class="overflow-x-auto text-sm">{renderError(error)}</pre>

			<div class="mt-4 flex gap-4">
				<button onClick={reset} class={/* @once */ button({ color: 'primary' })}>
					Try again
				</button>
				<button onClick={() => location.reload()} class={/* @once */ button({ color: 'outline' })}>
					Reload page
				</button>
			</div>
		</div>
	);
};

const AuthenticatedLayout = () => {
	const location = useLocation();
	const params = useParams('/u/:uid');

	const uid = () => params.uid as DID;

	if (!multiagent.accounts || !multiagent.accounts[uid()]) {
		const path = location.pathname.slice(4 + params.uid.length);
		return <Navigate href={`/login?to=${encodeURIComponent('@uid/' + path)}`} />;
	}

	const isDesktop = useMediaQuery('(width >= 640px)');

	const [profile] = createQuery({
		key: () => getProfileKey(uid(), uid()),
		fetch: getProfile,
		staleTime: 60_000,
		refetchOnMount: true,
		refetchOnReconnect: true,
		refetchOnWindowFocus: false,
	});

	const [latestNotification] = createQuery({
		key: () => getNotificationsLatestKey(uid()),
		fetch: getNotificationsLatest,
		staleTime: 10_000,
	});

	const basicProfile = (): MultiagentProfileData | undefined => {
		const remote = profile();

		if (remote) {
			return {
				avatar: remote.avatar.value,
				handle: remote.handle.value,
				displayName: remote.displayName.value,
			};
		}

		const local = getAccountData(uid())?.profile;
		if (local) {
			return local;
		}
	};

	createEffect(() => {
		let error = profile.error;
		let invalid = false;

		if (error) {
			if (error instanceof MultiagentError) {
				error = error.cause || error;
			}

			if (error instanceof XRPCError) {
				invalid = error.error === 'InvalidToken' || error.error === 'ExpiredToken';
			} else if (error instanceof Error) {
				invalid = error.message === 'INVALID_TOKEN';
			}

			if (invalid) {
				openModal(() => <InvalidSessionNoticeDialog uid={/* @once */ uid()} />, {
					disableBackdropClose: true,
				});
			}
		}
	});

	return (
		<div class="mx-auto flex min-h-screen max-w-[1500px] flex-col sm:flex-row sm:justify-center">
			<Show when={isDesktop()}>
				<div class="sticky top-0 flex h-screen flex-col items-end xl:basis-[30%]">
					<div class="flex grow flex-col gap-1 p-2 lg:p-4 xl:w-64">
						<A
							href={generatePath('/u/:uid', { uid: uid() })}
							title="Home"
							class="group flex items-center rounded-full hover:bg-hinted p-3 mr-auto -mb-3 -mt-3"
							activeClass="is-active"
							end
						>
							<div class="mr-0">
								<div class="h-8 w-8" style="background: url(https://langit.pages.dev/favicon.svg); background-size: 40px; background-position: center center; width: 32px; height: 32px; border-radius: 35%; border: 1px solid #80808040;"/>
							</div>
							
						</A>
						<A
							href={generatePath('/u/:uid', { uid: uid() })}
							title="Home"
							class="group flex items-center rounded-full hover:bg-hinted p-3 xl:mr-auto"
							activeClass="is-active"
							end
						>
							<div class="xl:mr-2">
								<HomeOutlinedIcon class="text-3xl group-[.is-active]:hidden" />
								<HomeIcon class="hidden text-3xl group-[.is-active]:block" />
							</div>

							<span class="hidden text-xl group-[.is-active]:font-bold xl:inline mr-2">Home</span>
						</A>

						<A
							href={generatePath('/u/:uid/explore', { uid: uid() })}
							title="Search"
							class="group flex items-center rounded-full hover:bg-hinted p-3 xl:mr-auto"
							activeClass="is-active"
						>
							<div class="xl:mr-2">
								<ExploreOutlinedIcon class="text-3xl group-[.is-active]:hidden" />
								<ExploreIcon class="hidden text-3xl group-[.is-active]:block" />
							</div>

							<span class="hidden text-xl group-[.is-active]:font-bold xl:inline mr-2">Explore</span>
						</A>

						<A
							href={generatePath('/u/:uid/notifications', { uid: uid() })}
							title="Notifications"
							class="group flex items-center rounded-full hover:bg-hinted p-3 xl:mr-auto"
							activeClass="is-active"
						>
							<div class="relative xl:mr-2">
								<NotificationsOutlinedIcon class="text-3xl group-[.is-active]:hidden" />
								<NotificationsIcon class="hidden text-3xl group-[.is-active]:block" />

								<Show when={latestNotification() && !latestNotification()!.read}>
									<div class="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-red-500" />
								</Show>
							</div>

							<span class="hidden text-xl group-[.is-active]:font-bold xl:inline mr-2">Notifications</span>
						</A>

						<A
							href={generatePath('/u/:uid/profile/:actor', { uid: uid(), actor: uid() })}
							title="Profile"
							class="group flex items-center rounded-full hover:bg-hinted p-3 xl:mr-auto"
							activeClass="is-active"
						>
							<div class="relative xl:mr-2">
								<AccountCircleOutlinedIcon class="text-3xl group-[.is-active]:hidden" />
								<AccountCircleIcon class="hidden text-3xl group-[.is-active]:block" />
							</div>

							<span class="hidden text-xl group-[.is-active]:font-bold xl:inline mr-2">Profile</span>
						</A>

						<A
							href={generatePath('/u/:uid/compose', { uid: uid() })}
							title="Compose"
							class="group flex items-center justify-center rounded-full bg-blue-500 mt-2 mx-auto xl:mx-3"
							activeClass="is-active"
						>
							<div class="p-3 xl:text-transparent block xl:block ">
								<AddBoxOutlinedIcon class="text-2xl group-[.is-active]:hidden" />
								<AddBoxIcon class="hidden text-2xl group-[.is-active]:block" />
							</div>

							<span class="hidden text-base xl:inline font-bold">Compose</span>

							<div class="p-3 text-transparent hidden xl:block">
								<AddBoxOutlinedIcon class="text-2xl group-[.is-active]:hidden" />
								<AddBoxIcon class="hidden text-2xl group-[.is-active]:block" />
							</div>
						</A>

						<div class="grow" />
						
						<Show when={isUpdateReady()}>
							<button
							onClick={() => {
								updateSW();
							}}
							class="mb-4 mt-2 mx-auto xl:mx-3 hidden xl:flex items-center text-center gap-4 px-3 xl:px-4 py-1.5 xl:py-2 text-sm rounded-full bg-primary hover:bg-primary/90 text-primary-fg font-bold"
							>
								<span>Update application</span> <AddIcon class="text-2xl group-[.is-active]:block" />
							</button>
						</Show>

						<A
							href={generatePath('/u/:uid/you', { uid: uid() })}
							title="You"
							class="group flex items-center rounded-md hover:bg-hinted"
							activeClass="is-active"
						>
							<div class="p-2">
								<div class="h-6 w-6 overflow-hidden rounded-full bg-muted-fg outline-2 outline-primary group-[.is-active]:outline">
									<Show when={basicProfile()?.avatar}>
										{(avatar) => <img src={avatar()} class="h-full w-full object-cover" />}
									</Show>
								</div>
							</div>

							<span class="hidden overflow-hidden text-ellipsis text-base group-[.is-active]:font-medium xl:inline">
								<Show when={basicProfile()} fallback="You">
									{(profile) => <>{profile().displayName || '@' + profile().handle}</>}
								</Show>
							</span>
						</A>
					</div>
				</div>
			</Show>

			<div class="flex min-w-0 md:max-w-[600px] xl:min-w-[600px] shrink grow flex-col border-divider sm:border-x xl:max-w-none xl:basis-[40%]">
				<ErrorBoundary fallback={handleError}>
					<Outlet />
				</ErrorBoundary>
			</div>

			<div class="hidden basis-[30%] xl:block"></div>

			<Show when={!isDesktop()}>
				<div class="sticky bottom-0 z-30 flex h-13 border-t border-divider bg-background text-primary">
					<A
						href={generatePath('/u/:uid', { uid: uid() })}
						title="Home"
						class="group flex grow basis-0 items-center justify-center text-2xl"
						activeClass="is-active"
						end
					>
						<HomeOutlinedIcon class="group-[.is-active]:hidden" />
						<HomeIcon class="hidden group-[.is-active]:block" />
					</A>
					<A
						href={generatePath('/u/:uid/explore', { uid: uid() })}
						title="Explore"
						class="group flex grow basis-0 items-center justify-center text-2xl"
						activeClass="is-active"
					>
						<ExploreOutlinedIcon class="group-[.is-active]:hidden" />
						<ExploreIcon class="hidden group-[.is-active]:block" />
					</A>
					<A
						href={generatePath('/u/:uid/compose', { uid: uid() })}
						title="Compose"
						class="group flex grow basis-0 items-center justify-center text-2xl"
						activeClass="is-active"
					>
						<AddBoxOutlinedIcon class="group-[.is-active]:hidden" />
						<AddBoxIcon class="hidden group-[.is-active]:block" />
					</A>
					<A
						href={generatePath('/u/:uid/notifications', { uid: uid() })}
						title="Notifications"
						class="group flex grow basis-0 items-center justify-center text-2xl"
						activeClass="is-active"
					>
						<div class="relative">
							<NotificationsOutlinedIcon class="group-[.is-active]:hidden" />
							<NotificationsIcon class="hidden group-[.is-active]:block" />

							<Show when={latestNotification() && !latestNotification()!.read}>
								<div class="absolute right-0 top-0 h-2 w-2 rounded-full bg-red-500" />
							</Show>
						</div>
					</A>
					<A
						href={generatePath('/u/:uid/you', { uid: uid() })}
						title="You"
						class="group flex grow basis-0 items-center justify-center text-2xl"
						activeClass="is-active"
					>
						<div class="h-6 w-6 overflow-hidden rounded-full bg-muted-fg outline-2 outline-primary group-[.is-active]:outline">
							<Show when={basicProfile()?.avatar}>
								{(avatar) => <img src={avatar()} class="h-full w-full object-cover" />}
							</Show>
						</div>
					</A>
				</div>
			</Show>
		</div>
	);
};

export default AuthenticatedLayout;
