"use client";

import { RoomActionCard } from "@/components/RoomActionCard";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { RoomCard } from "@/components/RoomCard";
import { createRoom, getUserRooms, getRoom } from "@/apis/room.client";
import { useEffect } from "react";

type Room = {
	id: string;
	slug: string;
	createdAt: string;
	adminId: string;
	isStarred: boolean;
	description: string | null;
	tags: string[];
};

export default function Home() {
	const router = useRouter();

	type RoomResponse = {
		roomId: string;
		slug: string;
	};

	// Add a class to the body to prevent scrolling when in the classroom
	useEffect(() => {
		document.body.classList.add("has-scroll");
		document.title = "Dashboard";

		// Cleanup function to remove the class when the component unmounts
		return () => {
			document.body.classList.remove("has-scroll");
		};
	}, []);

	const { mutate: createRoomMutation, isPending: isCreatingRoom } = useMutation<
		RoomResponse,
		Error,
		string
	>({
		mutationFn: createRoom,
		onSuccess: (data) => {
			console.log("Room created with ID:", data.roomId, data.slug);
			router.push(`/classroom?slug=${data.slug}`);
		},
		onError: (error) => {
			// This will now show a more specific error from the API
			console.error("Failed to create room:", error.message);
			alert(`Error: ${error.message}`);
		},
	});

	const handleCreateRoom = (values: { roomCode: string; name?: string }) => {
		if (values.roomCode.trim() !== "") {
			// Use the 'name' from the input to create the room
			createRoomMutation(values.roomCode);
		} else {
			alert("Please enter a name for the new room.");
		}
	};

	const { mutate: joinRoomMutation, isPending: isJoiningRoom } = useMutation({
		mutationFn: (roomCode: string) => {
			if (!roomCode) {
				throw new Error("Room code cannot be empty.");
			}
			return getRoom(roomCode);
		},
		onSuccess: (data) => {
			// Assuming getRoom returns an object with a slug
			router.push(`/classroom?slug=${data.room.slug}`);
		},
		onError: (error) => {
			alert(`Error: ${error.message}`);
		},
	});

	const {
		data: roomsData,
		isLoading: isLoadingRooms,
		error: roomsError,
	} = useQuery<{ rooms: Room[] }>({
		queryKey: ["userRooms"],
		queryFn: getUserRooms,
	});

	const myRooms = roomsData?.rooms || [];

	return (
		<main className=" min-h-screen bg-gray-50 container mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
				<RoomActionCard
					title="Create a Room"
					description="Start a new private session."
					buttonText="Create Room"
					onClick={handleCreateRoom}
					isLoading={isCreatingRoom}
					roomCodePlaceholder="new-room"
				/>
				<RoomActionCard
					title="Join a Room"
					description="Enter your room code to join a session."
					buttonText="Join Room"
					onClick={({ roomCode }) => joinRoomMutation(roomCode)}
					isLoading={isJoiningRoom}
					roomCodePlaceholder="cool-room"
				/>
			</div>

			<div className="mt-12 max-w-4xl mx-auto">
				<h2 className="text-2xl font-semibold text-gray-800 mb-4">My Rooms</h2>
				{isLoadingRooms && (
					<div className="text-center text-gray-500">Loading your rooms...</div>
				)}
				{roomsError && (
					<div className="text-center text-red-500">Failed to load rooms.</div>
				)}
				{!isLoadingRooms && !roomsError && (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
						{myRooms.length > 0 ? (
							myRooms.map((room) => (
								<RoomCard
									key={room.id}
									roomId={room.id}
									slug={room.slug}
									createdAt={room.createdAt}
									isStarred={room.isStarred}
									description={room.description}
									tags={room.tags}
								/>
							))
						) : (
							<p className="col-span-full text-center text-gray-500">
								You havent created any rooms yet.
							</p>
						)}
					</div>
				)}
			</div>
		</main>
	);
}
