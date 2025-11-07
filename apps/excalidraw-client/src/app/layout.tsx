import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@repo/shad-ui/index.css";
import "./global.css";
import Providers from "../providers";
import { SnackbarProvider } from "@/components/SnackbarProvider";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Authentication - VirtualClass",
	description: "Sign in or create an account.",
};

export default function AuthLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<Providers>
					<SnackbarProvider>{children}</SnackbarProvider>
				</Providers>
			</body>
		</html>
	);
}
