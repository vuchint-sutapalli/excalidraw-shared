// --- START: Icon Components ---
const SelectionIcon = () => (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
		<path d="M5 5L19.1421 12.0711L12.0711 14.1213L14.1213 19.1421L5 5Z" />
	</svg>
);
const RectangleIcon = () => (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
		<rect x="4" y="4" width="16" height="16" rx="2" />
	</svg>
);
const DiamondIcon = () => (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
		<path d="M12 3L21 12L12 21L3 12L12 3Z" />
	</svg>
);
const CircleIcon = () => (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
		<circle cx="12" cy="12" r="8" />
	</svg>
);
const ArrowIcon = () => (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
		<path d="M5 12H19" />
		<path d="M12 5L19 12L12 19" />
	</svg>
);
const PencilIcon = () => (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
		<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
	</svg>
);
const TextIcon = () => (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
		<path d="M4 7V4h16v3" />
		<path d="M9 20h6" />
		<path d="M12 4v16" />
	</svg>
);
const LineIcon = () => (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
		<path d="M5 19L19 5" />
	</svg>
);
const ClearIcon = () => (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
		<path d="M3 6h18" />
		<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
	</svg>
);
const WireIcon = () => (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
		<path d="M5 7 C 10 7, 14 17, 19 17" />
		<circle cx="5" cy="7" r="2" fill="currentColor" />
		<circle cx="19" cy="17" r="2" fill="currentColor" />
	</svg>
);
const EraserIcon = () => (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
		<path d="M20.5 6.5l-11 11" />
		<path d="M6.5 20.5l-4-4 11-11 4 4-11 11z" />
	</svg>
);
const LaserIcon = () => (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
		<path d="M14.29 14.29L19 19" />
		<path d="M5 19l4.29-4.29" />
		<path d="M19 5l-4.29 4.29" />
		<path d="M10.71 10.71L5 5" />
		<circle cx="12" cy="12" r="2" fill="currentColor" />
	</svg>
);
const HighlighterIcon = () => (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
		<path d="M12 20h9" />
		<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
	</svg>
);
const ClearHighlighterIcon = () => (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
		{/* Highlighter part */}
		<path d="M12 20h9" />
		<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
		{/* "X" part to signify clear */}
		<line x1="2" y1="2" x2="8" y2="8" strokeWidth="2.5" />
		<line x1="8" y1="2" x2="2" y2="8" strokeWidth="2.5" />
	</svg>
);
const AnnotationIcon = () => (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
		<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1" />
		<line x1="12" x2="12" y1="7" y2="13" />
		<line x1="9" x2="15" y1="10" y2="10" />
	</svg>
);

const SaveIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
		<polyline points="17 21 17 13 7 13 7 21"></polyline>
		<polyline points="7 3 7 8 15 8"></polyline>
	</svg>
);

// --- END: Icon Components --

export {
	SelectionIcon,
	RectangleIcon,
	DiamondIcon,
	CircleIcon,
	ArrowIcon,
	PencilIcon,
	TextIcon,
	LineIcon,
	ClearIcon,
	WireIcon,
	EraserIcon,
	LaserIcon,
	HighlighterIcon,
	ClearHighlighterIcon,
	AnnotationIcon,
	SaveIcon,
};
