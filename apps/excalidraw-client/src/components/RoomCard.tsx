"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
	MoreHorizontal,
	Copy,
	Share2,
	ExternalLink,
	Star,
	Loader2,
	DeleteIcon,
} from "lucide-react";
import type { CanvasWhiteboardRef } from "@/lib/CanvasWhiteboard";
import CanvasWhiteboard from "@/lib/CanvasWhiteboard";
import type { Element } from "@/lib/CanvasWhiteboard/types";
import {
	editRoomMetaData,
	deleteRoom,
	RoomData,
	fetchShapesInClient as getRoomElements,
} from "@/apis/room.client";
import { Button } from "@repo/shad-ui";
import { useSnackbar } from "./SnackbarProvider";

interface RoomCardProps {
	roomId: string;
	slug: string;
	createdAt: string;
	isStarred: boolean;
	description: string | null;
	tags: string[];
}

export function RoomCard({
	roomId,
	slug,
	createdAt,
	isStarred: initialIsStarred,
	description,
	tags,
}: RoomCardProps) {
	const router = useRouter();
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [isGenerating, setIsGenerating] = useState(true);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isStarred, setIsStarred] = useState(initialIsStarred);
	const [updatingField, setUpdatingField] = useState<
		"star" | "description" | null
	>(null);
	const whiteboardRef = useRef<CanvasWhiteboardRef>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const queryClient = useQueryClient();
	const { showSnackbar } = useSnackbar();

	const { data: roomData, isLoading } = useQuery({
		queryKey: ["roomElements", roomId],
		queryFn: () => {
			return getRoomElements(roomId);
		},
		enabled: !!roomId,
		staleTime: 5 * 60 * 1000, // Cache for 5 minutes
	});

	const elements = roomData?.shapes.map((el) => el.data) as Element[];

	// This effect generates the preview image when the elements are loaded.
	useEffect(() => {
		// We need a short timeout to ensure the off-screen CanvasWhiteboard has mounted
		// and its ref is available.
		if (elements && elements.length > 0) {
			const timer = setTimeout(async () => {
				if (whiteboardRef.current) {
					const dataUrl = await whiteboardRef.current.getCanvasDataURL();
					setImageUrl(dataUrl);
					setIsGenerating(false);
				}
			}, 100); // A small delay to ensure the ref is populated.

			return () => clearTimeout(timer);
		} else if (!isLoading) {
			setIsGenerating(false);
		}
	}, [elements, isLoading]);

	// Close menu on outside click
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setIsMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const roomUrl = `${window.location.origin}/classroom?slug=${slug}`;

	const handleCopyLink = async (e: React.MouseEvent) => {
		e.stopPropagation();
		await navigator.clipboard.writeText(roomUrl);
		showSnackbar("Link copied to clipboard!", "success");
		setIsMenuOpen(false);
	};

	const handleDelete = async (e: React.MouseEvent) => {
		e.stopPropagation();
		try {
			const responseData = await deleteRoom(slug);

			showSnackbar(responseData.message, "success");
			setIsMenuOpen(false);
		} catch (error) {
			console.error("Failed to delete room:", error);
			setIsMenuOpen(false);
			showSnackbar("Failed to delete room.", "error");
			return;
		}
		queryClient.invalidateQueries({ queryKey: ["userRooms"] });
	};

	const handleShare = async (e: React.MouseEvent) => {
		e.stopPropagation();
		if (navigator.share) {
			try {
				await navigator.share({
					title: `VirtualClass Room: ${slug}`,
					text: `Join my VirtualClass room!`,
					url: roomUrl,
				});
			} catch (error) {
				console.error("Error sharing:", error);
			}
		} else {
			// Fallback for browsers that don't support Web Share API
			handleCopyLink(e);
			alert("Share not supported, link copied to clipboard.");
		}
		setIsMenuOpen(false);
	};

	const handleOpenInNewTab = (e: React.MouseEvent) => {
		e.stopPropagation();
		window.open(roomUrl, "_blank", "noopener,noreferrer");
		setIsMenuOpen(false);
	};

	const handleMenuToggle = (e: React.MouseEvent) => {
		e.stopPropagation();
		setIsMenuOpen((prev) => !prev);
	};

	const { mutate: updateRoomMutation, isPending: isUpdatingMetadata } =
		useMutation({
			mutationFn: (variables: {
				slug: string;
				metadata: {
					isStarred?: boolean;
					description?: string;
					tags?: string[];
				};
			}) => editRoomMetaData(variables.slug, variables.metadata),
			onMutate: (variables) => {
				// Identify which field is being updated
				if (variables.metadata.isStarred !== undefined)
					setUpdatingField("star");
			},
			onSuccess: (updatedRoomData, variables) => {
				// Only update the local state for the field that was actually mutated.
				if (variables.metadata.isStarred !== undefined) {
					const newIsStarred = updatedRoomData.room.isStarred;

					setIsStarred(newIsStarred);
					if (newIsStarred) {
						showSnackbar("Room starred!", "success");
					} else {
						showSnackbar("Room unstarred!", "success");
					}
				} else if (variables.metadata.description) {
					showSnackbar("Room description updated!", "success");
				} else if (variables.metadata.tags) {
					showSnackbar("Room tags updated!", "success");
				}

				// Instead of re-fetching the whole list, we manually update the cache.
				// This is much more performant.
				queryClient.setQueryData<{ rooms: RoomData[] }>(
					["userRooms"],
					(oldData) => {
						if (!oldData) return oldData;

						// Find the room in the old data and replace it with the updated data.
						const updatedRooms = oldData.rooms.map((room) =>
							room.id === updatedRoomData.room.id ? updatedRoomData.room : room
						);

						return {
							...oldData,
							rooms: updatedRooms,
						};
					}
				);
			},
			onError: (error) => {
				console.error("Failed to update room:", error);
				// No need to revert state as we are not doing an optimistic update.
				alert("Failed to update room.");
			},
			onSettled: () => {
				// Clear the updating field regardless of success or error
				setUpdatingField(null);
			},
		});

	const handleStarToggle = (e: React.MouseEvent) => {
		e.stopPropagation();
		// Trigger the mutation to update the server
		updateRoomMutation({ slug, metadata: { isStarred: !isStarred } });
	};

	return (
		<div
			data-testid={slug + "-card"}
			className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-purple-500 transition-all duration-200 flex flex-col"
		>
			<div
				onClick={() => !isMenuOpen && router.push(`/classroom?slug=${slug}`)}
				className=" cursor-pointer aspect-video w-full bg-gray-100 rounded-t-lg flex items-center justify-center overflow-hidden"
			>
				{imageUrl ? (
					<Image
						src={imageUrl}
						alt={`Preview of ${slug}`}
						className="w-full h-full object-cover"
						width={480}
						height={270}
					/>
				) : isGenerating || isLoading ? (
					<Loader2 className="h-6 w-6 animate-spin text-gray-400" />
				) : (
					<span className="text-gray-400 text-sm">Empty</span>
				)}
			</div>
			{/* This off-screen canvas is used solely for generating the preview image. */}
			{isGenerating && elements && elements.length > 0 && (
				<div
					style={{
						position: "fixed",
						left: "-9999px",
						top: "-9999px",
						width: "480px",
						height: "270px",
					}}
				>
					<CanvasWhiteboard
						onSaveToHistory={() => {}}
						ref={whiteboardRef}
						initialViewTransform={{ scale: 1, offsetX: 0, offsetY: 0 }}
						controlledElements={elements}
						readOnly
						showToolbar={false}
						enableZoomPan={false}
						enableCursorTracking={false}
					/>
				</div>
			)}
			<div className="p-3 flex-1 flex flex-col justify-between">
				<div className="flex justify-between items-center">
					<div
						className="font-semibold text-gray-900 truncate cursor-pointer hover:underline"
						onClick={() => router.push(`/classroom?slug=${slug}`)}
					>
						{slug}
					</div>
					<div className="flex items-center">
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 rounded-full"
							onClick={handleStarToggle}
							aria-label={isStarred ? "Unstar room" : "Star room"}
							disabled={isUpdatingMetadata}
						>
							{isUpdatingMetadata && updatingField === "star" ? (
								<Loader2 className="h-4 w-4 animate-spin text-gray-500" />
							) : (
								<Star
									className={`h-4 w-4 transition-colors ${
										isStarred
											? "text-yellow-500 fill-yellow-400"
											: "text-gray-400 hover:text-gray-600"
									}`}
								/>
							)}
						</Button>
						<div className="relative" ref={menuRef}>
							<Button
								variant="ghost"
								size="icon"
								data-testid={slug + "-menu-button"}
								className="h-7 w-7 rounded-full cursor-pointer"
								onClick={handleMenuToggle}
							>
								<MoreHorizontal className="h-4 w-4 text-gray-500" />
							</Button>
							{isMenuOpen && (
								<div
									data-testid={slug + "-menu"}
									className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10 p-1
												after:content-[''] after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-x-8 after:border-x-transparent after:border-t-8 after:border-t-white
												before:content-[''] before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-x-[9px] before:border-x-transparent before:border-t-[9px] before:border-t-gray-200"
								>
									<button
										onClick={handleOpenInNewTab}
										className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
									>
										<ExternalLink className="h-4 w-4" />
										Open in new tab
									</button>
									{"share" in navigator && (
										<button
											onClick={handleShare}
											className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
										>
											<Share2 className="h-4 w-4" />
											Share
										</button>
									)}
									<button
										onClick={handleCopyLink}
										className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
									>
										<Copy className="h-4 w-4" />
										Copy link
									</button>
									<button
										onClick={handleDelete}
										className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
									>
										<DeleteIcon className="h-4 w-4" />
										Delete Room
									</button>
								</div>
							)}
						</div>
					</div>
					{description && (
						<p className="text-sm text-gray-600 mt-2 line-clamp-2">
							{description}
						</p>
					)}
				</div>
				<div className="mt-3">
					{tags && tags.length > 0 && (
						<div className="flex flex-wrap gap-1.5">
							{tags.map((tag) => (
								<span
									key={tag}
									className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full"
								>
									{tag}
								</span>
							))}
						</div>
					)}
				</div>
				<div className="text-sm text-gray-500 mt-2">
					Created: {new Date(createdAt).toLocaleDateString()}
				</div>
			</div>
		</div>
	);
}
