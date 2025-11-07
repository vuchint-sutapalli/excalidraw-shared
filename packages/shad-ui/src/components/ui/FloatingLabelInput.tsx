import * as React from "react";
import { cn } from "../../lib/utils";
import { Input } from "./input";

interface FloatingLabelInputProps extends React.ComponentProps<"input"> {
	label: string;
}

export function FloatingLabelInput({
	label,
	className,
	value,
	defaultValue,
	...props
}: FloatingLabelInputProps) {
	// track if input has any value
	const hasValue =
		value !== undefined
			? String(value).length > 0
			: defaultValue !== undefined && String(defaultValue).length > 0;

	return (
		<div className="relative w-full">
			<Input
				{...props}
				value={value}
				defaultValue={defaultValue}
				className={cn(
					// "peer pt-5 pb-2", // space for floating label
					"peer px-3 py-3", // balanced padding

					className
				)}
			/>

			{/* Label should only appear when input is focused or has value */}
			<label
				className={cn(
					"absolute left-3 px-1 text-sm text-muted-foreground transition-all duration-200 bg-[#f2f7fe]",
					// start hidden when placeholder is visible
					"pointer-events-none peer-placeholder-shown:opacity-0 peer-placeholder-shown:translate-y-0",
					// and if user has typed something
					hasValue ? "opacity-100 -top-2 text-xs" : "top-3 text-sm"
				)}
			>
				{label}
			</label>
		</div>
	);
}
