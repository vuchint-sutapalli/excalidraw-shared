"use client";

import { useState, useRef, useEffect } from "react";
// import { usePathname } from "next/navigation";
import Link from "next/link";
import { Video, Menu, LogOut } from "lucide-react";
import { Button } from "@repo/shad-ui";

export function Navbar() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);
	// const pathname = usePathname();

	// Effect to focus the dropdown when it opens
	useEffect(() => {
		if (isMenuOpen && dropdownRef.current) {
			dropdownRef.current.focus();
		}
		if (!isMenuOpen && document.activeElement === dropdownRef.current) {
			buttonRef.current?.focus();
		}
	}, [isMenuOpen]);

	const handleMenuToggle = () => {
		setIsMenuOpen((prev) => !prev);
	};

	const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
		// Check if the new focused element is still inside the menu.
		// If the focus is moving outside the menu container, and not to the menu button itself, close the menu.
		if (
			!event.currentTarget.contains(event.relatedTarget) &&
			event.relatedTarget !== buttonRef.current
		) {
			setIsMenuOpen(false);
		}
	};

	return (
		<header className="sticky top-0 z-50 w-full border-b bg-white">
			<div className="container flex h-14 items-center justify-between p-4">
				<div className="flex items-center space-x-4">
					{/* Hamburger Menu */}
					<div className="relative" ref={menuRef}>
						<Button
							variant="ghost"
							size="icon"
							ref={buttonRef}
							className="h-8 w-8"
							onClick={handleMenuToggle}
							aria-label="Open menu"
						>
							<Menu className="h-5 w-5 text-gray-600" />
						</Button>
						<div
							className={`absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20 p-1 outline-none ${
								isMenuOpen ? "block" : "hidden"
							}`}
							ref={dropdownRef}
							onBlur={handleBlur}
							tabIndex={-1} // Make the div focusable
						>
							{/* This div is the target for the portal from ChatRoomClient */}
							<div id="navbar-menu-portal"></div>
							<Link
								href="/signout"
								className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-md"
								onClick={() => setIsMenuOpen(false)} // Close on link click
							>
								<LogOut className="h-4 w-4" />
								Sign Out
							</Link>
						</div>
					</div>
					{/* Logo and App Name */}
					<Link href="/dashboard" className="flex items-center space-x-3">
						<div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
							<Video className="w-5 h-5 text-white" />
						</div>
						<span className="font-bold text-lg text-slate-800">
							VirtualClassStaging
						</span>
					</Link>
				</div>
				{/* Other right-aligned items like a user profile can go here */}
			</div>
		</header>
	);
}
