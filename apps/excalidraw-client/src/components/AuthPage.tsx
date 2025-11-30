"use client";

import { useState } from "react";
import {
	Button,
	Input,
	Label,
	Card,
	CardHeader,
	CardContent,
	CardTitle,
} from "@repo/shad-ui";

import { Video, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { signup, signin } from "../apis/auth";

interface AuthPageProps {
	mode: "signin" | "signup";
}

export default function AuthPage({ mode }: AuthPageProps) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();
	const searchParams = useSearchParams();

	const isSignUp = mode === "signup";

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setIsLoading(true);

		if (isSignUp) {
			if (password !== confirmPassword) {
				setError("Passwords do not match");
				setIsLoading(false);
				return;
			}
			try {
				await signup(email, password);
				// You might want to show a success toast here instead of an alert
				alert("Signup successful! Please sign in.");
				router.push("/signin");
			} catch (err) {
				if (err instanceof Error) {
					setError(err.message);
				} else {
					setError("An unexpected error occurred during signup.");
				}
			} finally {
				setIsLoading(false);
			}
		} else {
			try {
				await signin(email, password);
				// Check for a redirect URL. If it exists, navigate there.
				// Otherwise, go to the default dashboard.
				const redirectUrl = searchParams.get("redirect");
				if (redirectUrl) {
					router.push(redirectUrl);
				} else {
					router.push("/dashboard");
				}
			} catch (err) {
				if (err instanceof Error) {
					setError(err.message);
				} else {
					setError("An unexpected error occurred during signin.");
				}
			} finally {
				setIsLoading(false);
			}
		}
	};

	const handleGuestSignIn = async () => {
		setError(null);
		setIsLoading(true);

		try {
			await signin("test@gmail.com", "testtest");

			router.push("/dashboard");
		} catch (err) {
			if (err instanceof Error) {
				setError(err.message);
			} else {
				setError("An unexpected error occurred during guest signin.");
			}
		} finally {
			setIsLoading(false);
		}
	};

	const pageConfig = {
		signin: {
			title: "Welcome Back",
			subtitle: "Sign in to your account to continue",
			buttonText: "Sign In",
			loadingText: "Signing in...",
			switchText: "Don't have an account?",
			switchLink: "/signup",
			switchLinkText: "Sign up",
		},
		signup: {
			title: "Create Account",
			subtitle: "Join thousands of educators worldwide",
			buttonText: "Create Account",
			loadingText: "Creating account...",
			switchText: "Already have an account?",
			switchLink: "/signin",
			switchLinkText: "Sign in",
		},
	};

	const config = pageConfig[mode];

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
			<div className="w-full max-w-md">
				{/* Logo */}
				<div className="flex items-center justify-center mb-8">
					<div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
						<Video className="w-6 h-6 text-white" />
					</div>
					<span className="ml-3 text-2xl font-bold text-gray-900">
						VirtualClass
					</span>
				</div>

				<Card className="shadow-lg border-0">
					<CardHeader className="text-center pb-4">
						<CardTitle className="text-2xl font-bold text-gray-900">
							{config.title}
						</CardTitle>
						<p className="text-gray-600 mt-2">{config.subtitle}</p>
					</CardHeader>
					<CardContent className="space-y-4">
						<form onSubmit={handleSubmit} className="space-y-4">
							{error && (
								<div className="bg-destructive/10 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive">
									<p>{error}</p>
								</div>
							)}
							<div className="space-y-2">
								<Label
									htmlFor="email"
									className="text-sm font-medium text-gray-700"
								>
									Email
								</Label>
								<Input
									id="email"
									type="email"
									placeholder={isSignUp ? "your@email.com" : "Enter your email"}
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									className="h-11"
								/>
							</div>

							<div className="space-y-2">
								<Label
									htmlFor="password"
									className="text-sm font-medium text-gray-700"
								>
									Password
								</Label>
								<div className="relative">
									<Input
										id="password"
										type={showPassword ? "text" : "password"}
										placeholder={
											isSignUp ? "Create a password" : "Enter your password"
										}
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
										className="h-11 pr-10"
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
										aria-label={
											showPassword ? "Hide password" : "Show password"
										}
									>
										{showPassword ? (
											<EyeOff className="w-4 h-4" />
										) : (
											<Eye className="w-4 h-4" />
										)}
									</button>
								</div>
							</div>

							{isSignUp && (
								<div className="space-y-2">
									<Label
										htmlFor="confirmPassword"
										className="text-sm font-medium text-gray-700"
									>
										Confirm Password
									</Label>
									<div className="relative">
										<Input
											id="confirmPassword"
											type={showConfirmPassword ? "text" : "password"}
											placeholder="Confirm your password"
											value={confirmPassword}
											onChange={(e) => setConfirmPassword(e.target.value)}
											required
											className="h-11 pr-10"
										/>
										<button
											type="button"
											onClick={() =>
												setShowConfirmPassword(!showConfirmPassword)
											}
											className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
											aria-label={
												showConfirmPassword ? "Hide password" : "Show password"
											}
										>
											{showConfirmPassword ? (
												<EyeOff className="w-4 h-4" />
											) : (
												<Eye className="w-4 h-4" />
											)}
										</button>
									</div>
								</div>
							)}
							<Button
								type="submit"
								className="w-full h-11 bg-gray-900 hover:bg-black text-white"
								disabled={isLoading}
							>
								{isLoading ? config.loadingText : config.buttonText}
							</Button>
						</form>

						{/* Guest access only on Sign In */}
						{!isSignUp && (
							<div className="pt-2">
								<div className="flex items-center my-4">
									<span className="flex-1 border-t border-gray-200" />
									<span className="px-2 text-xs text-gray-400">or</span>
									<span className="flex-1 border-t border-gray-200" />
								</div>
								<Button
									type="button"
									variant="outline"
									className="w-full h-11 border cursor-pointer border-gray-300 text-gray-700 hover:bg-gray-50"
									onClick={handleGuestSignIn}
									disabled={isLoading}
								>
									Continue as Guest
								</Button>
							</div>
						)}

						<div className="text-center pt-4 border-t border-gray-200">
							<p className="text-sm text-gray-600">
								{config.switchText}{" "}
								<Link
									href={config.switchLink}
									className="text-purple-600 hover:text-purple-700 font-medium"
								>
									{config.switchLinkText}
								</Link>
							</p>
						</div>
					</CardContent>
				</Card>

				<div className="text-center mt-6">
					<Link
						href="/dashboard"
						className="text-sm text-gray-500 hover:text-gray-700"
					>
						← Back to home
					</Link>
				</div>
			</div>
		</div>
	);
}
