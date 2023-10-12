import { generatePath, useParams } from '~/router.ts';

import ChevronRightIcon from '~/icons/baseline-chevron-right';
import ArrowLeftIcon from '~/icons/baseline-arrow-left';

const AuthenticatedListsModerationPage = () => {
	const params = useParams('/u/:uid/you/moderation/lists');

	const handleGoBack = () => {
		window.history.go(-1); // Go back one step in browser history
	};

	return (
		<div class="flex flex-col">
			<div class="sticky top-0 z-10 flex h-13 items-center border-b border-divider bg-background px-4">
				<button onClick={handleGoBack} class="text-base font-bold mr-3 p-3 -ml-3"><ArrowLeftIcon/></button>
				<p class="text-base font-bold">User lists</p>
			</div>

			<a
				link
				href={generatePath('/u/:uid/you/moderation/lists/self', params)}
				class="flex items-center gap-4 px-4 py-3 text-sm hover:bg-hinted"
			>
				<span class="grow">Your user lists</span>
				<ChevronRightIcon class="-mr-1 shrink-0 text-xl text-muted-fg" />
			</a>

			<a
				link
				href={generatePath('/u/:uid/you/moderation/lists/mute', params)}
				class="flex items-center gap-4 px-4 py-3 text-sm hover:bg-hinted"
			>
				<span class="grow">Subscribed mute lists</span>
				<ChevronRightIcon class="-mr-1 shrink-0 text-xl text-muted-fg" />
			</a>

			<a
				link
				href={generatePath('/u/:uid/you/moderation/lists/block', params)}
				class="flex items-center gap-4 px-4 py-3 text-sm hover:bg-hinted"
			>
				<span class="grow">Subscribed block lists</span>
				<ChevronRightIcon class="-mr-1 shrink-0 text-xl text-muted-fg" />
			</a>
		</div>
	);
};

export default AuthenticatedListsModerationPage;
