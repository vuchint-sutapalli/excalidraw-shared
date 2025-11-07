import { JsonCanvasViewer } from "@/components/JsonCanvasViewer";

export default function ViewPage() {
	return (
		<div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4">
			<h1 className="text-2xl font-bold text-center mb-4">
				Import and View Canvas JSON
			</h1>
			<JsonCanvasViewer />
		</div>
	);
}
