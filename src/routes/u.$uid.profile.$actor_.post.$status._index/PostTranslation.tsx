import { Match, Switch } from 'solid-js';

import { createQuery } from '@intrnl/sq';

import { languageNames } from '~/utils/intl/displaynames.ts';

import CircularProgress from '~/components/CircularProgress.tsx';
import button from '~/styles/primitives/button.ts';

export interface PostTranslationProps {
	target?: string;
	text: string;
}

interface TranslationResult {
	state: 'TRANSLATED';
	result: string;
	source: string[];
}

const PostTranslation = (props: PostTranslationProps) => {
	const [trans, { refetch }] = createQuery({
		key: () => ['getTranslation', props.target, props.text] as const,
		fetch: async (key) => {
			const [, target = navigator.language, text] = key;

			const url = new URL(
				'https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dj=1&source=input',
			);
			url.searchParams.set('sl', 'auto');
			url.searchParams.set('tl', target);
			url.searchParams.set('q', text);

			const response = await fetch(url);
			const json = await response.json();

			if (!response.ok) {
				throw new Error(`Received ${response.status}: ${json.state}`);
			}

			return {
				state: 'TRANSLATED',
				result: json.sentences.map((n: any) => (n && n.trans) || '').join(''),
				source: json.ld_result.srclangs,
				raw: json,
			} as TranslationResult;
		},
		staleTime: Infinity,
	});

	return (
		<div class="mt-3">
			<Switch>
				<Match when={trans.loading}>
					<div class="flex justify-center p-2">
						<CircularProgress />
					</div>
				</Match>

				<Match when={trans.error}>
					{(_err) => (
						<div class="flex flex-col items-center gap-2 p-2">
							<p class="text-center text-sm text-muted-fg">Unable to retrieve translation</p>

							<div>
								<button onClick={() => refetch()} class={/* @once */ button({ color: 'primary' })}>
									Retry
								</button>
							</div>
						</div>
					)}
				</Match>

				<Match when={trans()}>
					{(data) => (
						<>
							<p class="text-sm text-muted-fg">
								Translated from{' '}
								{data()
									.source.map((code) => languageNames.of(code))
									.join(', ')}
							</p>
							<p class="whitespace-pre-wrap break-words text-base">{data().result}</p>
						</>
					)}
				</Match>
			</Switch>
		</div>
	);
};

export default PostTranslation;
