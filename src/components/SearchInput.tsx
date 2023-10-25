import CloseIcon from '~/icons/baseline-close';
import SearchIcon from '~/icons/baseline-search';

export interface SearchInputProps {
	value?: string;
	placeholder?: string;
	onEnter: (next: string) => void;
	tall?: boolean;
}

const SearchInput = (props: SearchInputProps) => {
	return (
		<div class={`flex ${props.tall ? 'h-10' : 'h-8'} flex grow rounded-full bg-hinted outline-2 -outline-offset-1 outline-accent outline-none focus-within:outline dark:bg-[#202327]`}>
		<div class={`flex ${props.tall ? 'flex' : 'hidden'} items-center justify-center ml-4 -mr-1`}> <SearchIcon class=" opacity-50 h-5 w-5"/> </div>
			<input
				type="text"
				value={props.value ?? ''}
				placeholder={props.placeholder ?? 'Search Bluesky'}
				onKeyDown={(ev) => {
					const value = ev.currentTarget.value;

					if (ev.key === 'Enter') {
						props.onEnter(value);
					}
				}}
				class="peer grow bg-transparent pl-4 text-sm text-primary outline-none placeholder:text-muted-fg"
			/>

			<button
				onClick={(ev) => {
					const btn = ev.currentTarget;
					const input = btn.parentElement?.querySelector('input');

					if (input) {
						input.value = '';
						input.focus();
					}
				}}
				class="pl-2 pr-2 text-muted-fg hover:text-primary peer-placeholder-shown:hidden"
			>
				<CloseIcon />
			</button>
		</div>
	);
};

export default SearchInput;
