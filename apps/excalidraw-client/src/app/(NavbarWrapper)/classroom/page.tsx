import { getRoomFromServer } from "@/apis/room.server";
import { redirect } from "next/navigation";
import ChatRoom from "@/components/ChatRoom";

import { validateSearchParam } from "@/lib/validateSearchParam";

import React from "react";

// Page components in the App Router are Server Components by default.

// They receive searchParams as a prop, which contains the URL query parameters.
interface ClassroomPageProps {
	searchParams: { [key: string]: string | string[] | undefined };
}

async function ClassRoom({ searchParams }: ClassroomPageProps) {
	const parsedParams = await searchParams;
	console.log("parsedParams", parsedParams);

	const { slug } = await searchParams;

	let slugStr = "";

	try {
		slugStr =
			validateSearchParam(
				"slug",
				{ slug: slug },
				{
					required: true,
					maxLength: 50,
					regex: /^[a-zA-Z0-9-_]+$/, // only letters, numbers, dashes, underscores
				}
			) ?? "";

		if (!slugStr) {
			return <div> provide a valid room name </div>;
		}
	} catch (error) {
		return <div>{String(error)}</div>;
	}

	// const { room, userId, user, error } = await getRoomFromServer(slugStr);
	const {
		roomData: room,
		userData: user,
		error,
	} = await getRoomFromServer(slugStr);

	// Case 1: User is not authenticated or authorized for this room.
	if (error === "unauthorized" || !user) {
		// Construct the original URL to pass as a redirect parameter.
		const originalUrl = `/classroom?slug=${slugStr}`;
		const redirectUrl = encodeURIComponent(originalUrl);
		// Redirect to the sign-in page, preserving the original destination.
		redirect(`/signin?redirect=${redirectUrl}`);
	}

	// Case 2: Room does not exist, but the user is likely authenticated.
	if (error === "not-found" || !room) {
		return (
			<div className="flex flex-col h-screen">
				Could not find a room with the name: {slugStr}
			</div>
		);
	}

	console.log("userData,", user);

	// Case 3: Success!
	return (
		<div className="flex flex-col h-screen">
			<ChatRoom
				userName={user.name ?? "Guest"}
				userId={user.userId}
				roomId={room.id}
				slug={slugStr}
			/>
			{/* <Canvas roomId={Number(roomData.room.id)} slug={slugStr} /> */}
		</div>
	);
}

export default ClassRoom;
