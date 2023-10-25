import { closeModal } from '~/globals/modals.tsx';

import button from '~/styles/primitives/button.ts';
import * as dialog from '~/styles/primitives/dialog.ts';

export interface ImageAltDialogProps {
	alt: string;
}

const ImageAltDialog = (props: ImageAltDialogProps) => {
	return (
		<div class={/* @once */ dialog.content()}>
			<h1 class={/* @once */ dialog.title()}>Image description</h1>

			<p class="-mx-4 mt-3 overflow-y-auto whitespace-pre-wrap break-words px-4 text-sm">{props.alt}</p>

			<div class={/* @once */ dialog.actions()}>
				<button onClick={closeModal} class={/* @once */ button({ color: 'primary' })}>
					Dismiss
				</button>
			</div>
		</div>
	);
};

export default ImageAltDialog;
