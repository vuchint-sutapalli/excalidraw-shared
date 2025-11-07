"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

export type SnackbarType = "success" | "error";

export interface SnackbarProps {
	message: string;
	type: SnackbarType;
	onClose: () => void;
}

const typeStyles = {
	success: {
		bg: "bg-green-50",
		border: "border-green-400",
		iconColor: "text-green-600",
		textColor: "text-green-800",
		Icon: CheckCircle,
	},
	error: {
		bg: "bg-red-50",
		border: "border-red-400",
		iconColor: "text-red-600",
		textColor: "text-red-800",
		Icon: XCircle,
	},
};

export function Snackbar({ message, type, onClose }: SnackbarProps) {
	const [isExiting, setIsExiting] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => {
			setIsExiting(true);
			setTimeout(onClose, 300); // Wait for exit animation
		}, 5000); // Auto-close after 5 seconds

		return () => clearTimeout(timer);
	}, [onClose]);

	const handleClose = () => {
		setIsExiting(true);
		setTimeout(onClose, 300);
	};

	const styles = typeStyles[type];
	const Icon = styles.Icon;

	return (
		<div
			className={`fixed bottom-5 right-5 z-50 flex items-center p-4 rounded-lg shadow-lg border-l-4 transition-all duration-300 ${styles.bg} ${styles.border} ${isExiting ? "translate-x-[calc(100%+2rem)]" : "translate-x-0"}`}
			role="alert"
		>
			<Icon className={`w-6 h-6 ${styles.iconColor}`} />
			<p className={`ml-3 font-medium ${styles.textColor}`}>{message}</p>
			<button
				onClick={handleClose}
				className={`ml-4 -mr-2 p-1.5 rounded-full ${styles.textColor} opacity-70 hover:opacity-100 hover:bg-black/10 transition-colors`}
			>
				<X className="w-5 h-5" />
			</button>
		</div>
	);
}
