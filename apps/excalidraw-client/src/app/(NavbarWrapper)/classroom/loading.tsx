import { Loader2 } from "lucide-react";

export default function Loading() {
	// You can add any UI inside Loading, including a Skeleton.
	return (
		<div className="flex h-screen w-full items-center justify-center bg-gray-100">
			<div className="flex flex-col items-center gap-4">
				<Loader2 className="h-12 w-12 animate-spin text-purple-600" />
				<p className="text-lg text-gray-700">Loading Classroom...</p>
			</div>
		</div>
	);
}
