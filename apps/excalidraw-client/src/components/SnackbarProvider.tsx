"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { Snackbar, SnackbarProps, SnackbarType } from "./Snackbar";

interface SnackbarContextType {
	showSnackbar: (message: string, type: SnackbarType) => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(
	undefined
);

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
	const [snackbar, setSnackbar] = useState<Omit<
		SnackbarProps,
		"onClose"
	> | null>(null);

	const showSnackbar = useCallback((message: string, type: SnackbarType) => {
		setSnackbar({ message, type });
	}, []);

	const handleClose = () => {
		setSnackbar(null);
	};

	return (
		<SnackbarContext.Provider value={{ showSnackbar }}>
			{children}
			{snackbar && <Snackbar {...snackbar} onClose={handleClose} />}
		</SnackbarContext.Provider>
	);
}

export const useSnackbar = () => {
	const context = useContext(SnackbarContext);
	if (!context) {
		throw new Error("useSnackbar must be used within a SnackbarProvider");
	}
	return context;
};
