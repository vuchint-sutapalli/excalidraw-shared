"use client";

import { useRef, useMemo } from "react";

import { formatTimestamp } from "@/lib";
import type { AnnotationElement } from "@/lib/CanvasWhiteboard/types";
import { Button, buttonVariants } from "@repo/shad-ui";
import { Send, X, Circle, CheckCircle2, Trash2 } from "lucide-react";

interface AnnotationModalProps {
	annotation: AnnotationElement;
	getModalPosition: () => { x: number; y: number };
	onClose: () => void;
	onStateChange: () => void;
	onDelete: () => void;
	onCommentAdd: (text: string) => void;
	currentUserName: string;
}

export function AnnotationModal({
	annotation,
	getModalPosition,
	onClose,
	onStateChange,
	onDelete,
	onCommentAdd,
	currentUserName,
}: AnnotationModalProps) {
	const modalRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Memoize the position so it's only calculated once when the modal opens,
	// not on every re-render caused by typing in the textarea.
	// The dependency array ensures it only recalculates if the annotation or the function changes.
	const position = useMemo(
		() => getModalPosition(),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[annotation.id, getModalPosition]
	);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (textareaRef.current) {
			const newComment = textareaRef.current.value;
			if (newComment && newComment.trim()) {
				onCommentAdd(newComment.trim());
				textareaRef.current.value = "";
			}
			textareaRef.current.focus();
		}
	};

	return (
		<div
			ref={modalRef}
			className="absolute z-20 w-80 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col"
			style={{ left: position.x, top: position.y }}
		>
			<div className="flex items-center justify-between p-2 pl-3 border-b border-gray-200">
				<div className="font-semibold text-sm">
					{annotation.comments && annotation.comments.length
						? "Annotation Thread"
						: "New Annotation"}
				</div>
				<div className="flex items-center">
					<button
						onClick={onStateChange}
						aria-label="Toggle annotation state"
						className={buttonVariants({ variant: "ghost", size: "icon" })}
					>
						{annotation.annotationState === "open" ? (
							<Circle className="h-4 w-4 text-red-500" />
						) : (
							<CheckCircle2 className="h-4 w-4 text-green-500" />
						)}
					</button>
					<button
						onClick={onDelete}
						aria-label="Delete annotation thread"
						className={buttonVariants({
							variant: "ghost",
							size: "icon",
						})}
					>
						<Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
					</button>
					<button
						onClick={onClose}
						aria-label="Close annotation"
						className={buttonVariants({ variant: "ghost", size: "icon" })}
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			</div>

			<div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-60">
				{annotation.comments.map((comment) => (
					<div key={comment.id} className="text-sm">
						<div className="flex items-baseline justify-between">
							<p className="font-semibold text-gray-800">{comment.userName}</p>
							<span className="text-xs text-gray-400">
								{formatTimestamp(comment.timestamp)}
							</span>
						</div>
						<p className="text-gray-600 mt-0.5">{comment.text}</p>
					</div>
				))}
				{annotation.comments.length === 0 && (
					<p className="text-sm text-gray-500">No comments yet.</p>
				)}
			</div>
			<form onSubmit={handleSubmit} className="p-2 border-t border-gray-200">
				<div className="flex items-center gap-2">
					<textarea
						ref={textareaRef}
						placeholder={
							annotation.comments && annotation.comments.length
								? `reply as ${currentUserName}`
								: `comment as ${currentUserName}`
						}
						className="flex-1 w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
						rows={2}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								handleSubmit(e);
							}
						}}
					/>
					<Button type="submit" size="icon">
						<Send className="h-4 w-4" />
					</Button>
				</div>
			</form>
		</div>
	);
}
