// import { useEffect, useCallback } from "react";

// interface UseKeyboardProps {
// 	onDelete: () => void;
// 	setIsSpacePressed?: (isPressed: boolean) => void;
// 	setIsCtrlPressed?: (isPressed: boolean) => void;
// }

// export const useKeyboard = ({
// 	onDelete,
// 	setIsSpacePressed,
// 	setIsCtrlPressed,
// }: UseKeyboardProps) => {
// 	const handleKeyDown = useCallback(
// 		(event: React.KeyboardEvent) => {
// 			// Don't handle events if a text input is focused
// 			const target = event.target as HTMLElement;
// 			if (
// 				target.tagName === "INPUT" ||
// 				target.tagName === "TEXTAREA" ||
// 				target.isContentEditable
// 			) {
// 				return;
// 			}

// 			if (event.key === "Delete" || event.key === "Backspace") {
// 				event.preventDefault(); // Prevent browser back navigation on backspace
// 				onDelete();
// 			}

// 			if (event.code === "Space" && setIsSpacePressed) {
// 				// Prevent scrolling when space is pressed
// 				event.preventDefault();
// 				setIsSpacePressed(true);
// 			}

// 			if (event.key === "Control" && setIsCtrlPressed) {
// 				setIsCtrlPressed(true);
// 			}
// 		},
// 		[onDelete, setIsSpacePressed, setIsCtrlPressed]
// 	);

// 	const handleKeyUp = useCallback(
// 		(event: React.KeyboardEvent) => {
// 			if (event.code === "Space" && setIsSpacePressed) {
// 				setIsSpacePressed(false);
// 			}

// 			if (event.key === "Control" && setIsCtrlPressed) {
// 				setIsCtrlPressed(false);
// 			}
// 		},
// 		[setIsSpacePressed, setIsCtrlPressed]
// 	);

// 	return { handleKeyDown, handleKeyUp };
// };
