"use client";

import { Loader2 } from "lucide-react";
import { useState, FormEvent } from "react";
import {
	Button,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	Card,
	Input,
	Label,
} from "@repo/shad-ui";

interface RoomActionCardProps {
	title: string;
	description: string;
	buttonText: string;
	onClick: (values: { roomCode: string; name?: string }) => void;
	isLoading?: boolean;
	showRoomCodeInput?: boolean;
	roomCodePlaceholder?: string;
}

export function RoomActionCard({
	title,
	description,
	buttonText,
	onClick,
	isLoading = false,
	showRoomCodeInput = true,
	roomCodePlaceholder = "e.g., 'my-cool-room'",
}: RoomActionCardProps) {
	const [roomCode, setRoomCode] = useState("");

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		onClick({ roomCode: roomCode.trim() });
	};

	return (
		<Card className="w-full max-w-sm flex flex-col">
			<form onSubmit={handleSubmit} className="flex flex-col h-full p-4">
				<CardHeader className="p-0 pb-4">
					<CardTitle className="text-2xl">{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</CardHeader>
				<CardContent className="flex-grow space-y-4 p-0">
					{showRoomCodeInput && (
						<div className="space-y-2">
							<Label htmlFor="room-code">Room Name</Label>
							<Input
								id="room-code"
								placeholder={roomCodePlaceholder}
								value={roomCode}
								onChange={(e) => setRoomCode(e.target.value)}
								required
								autoComplete="off"
								aria-describedby="room-code-description"
							/>
						</div>
					)}
				</CardContent>
				<div className="pt-4 mt-auto">
					<Button
						type="submit"
						className="w-full bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
						disabled={isLoading || (showRoomCodeInput && !roomCode.trim())}
					>
						{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{isLoading ? "Processing..." : buttonText}
					</Button>
				</div>
			</form>
		</Card>
	);
}
