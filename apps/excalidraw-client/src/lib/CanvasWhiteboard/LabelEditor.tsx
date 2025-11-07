import React, { useLayoutEffect } from "react";
import styles from "./LabelEditor.module.css";

interface LabelEditorProps {
	value: string;
	onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	onBlur: () => void;
	onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
	style: React.CSSProperties;
	// The ref is now a regular prop
	ref: React.Ref<HTMLTextAreaElement>;
}

export const LabelEditor: React.FC<LabelEditorProps> = ({
	value,
	onChange,
	onBlur,
	onKeyDown,
	style,
	ref,
}) => {
	// Auto-resize the textarea based on content
	useLayoutEffect(() => {
		const textarea = (ref as React.RefObject<HTMLTextAreaElement>)?.current;
		if (textarea) {
			// Reset height to shrink if needed
			textarea.style.height = "auto";
			// Set height to scroll height
			textarea.style.height = `${textarea.scrollHeight}px`;
		}
	}, [value, ref]);

	return (
		<textarea
			ref={ref}
			value={value}
			onChange={onChange}
			onBlur={onBlur}
			onKeyDown={onKeyDown}
			style={style}
			className={styles.textarea}
			rows={1}
		/>
	);
};

LabelEditor.displayName = "LabelEditor";
