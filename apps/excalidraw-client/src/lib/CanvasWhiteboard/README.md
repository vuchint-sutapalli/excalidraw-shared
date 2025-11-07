# CanvasWhiteboard Component

Welcome to the `CanvasWhiteboard` component! This is a feature-rich, interactive whiteboard built with React and TypeScript, designed for drawing, selecting, and manipulating various shapes and elements. It's inspired by applications like Excalidraw and is built with performance and extensibility in mind.

## Core Concepts

The architecture is built on a few key concepts that are important to understand.

### 1. Double Canvas Architecture

To ensure a smooth user experience, the component uses a double-canvas rendering technique:

- **Static Canvas (`staticCanvasRef`)**: This is the bottom layer. It renders all the elements that are not currently being interacted with. This canvas is only redrawn when elements are added, removed, or modified, making it very efficient.
- **Active Canvas (`activeCanvasRef`)**: This is the top layer, rendered directly above the static canvas. It's used for all real-time interactions, such as drawing new shapes, showing selection boxes and handles, and providing visual feedback during moving, resizing, or rotating. This canvas is cleared and redrawn on almost every frame during an interaction, which keeps the UI feeling responsive.

This separation prevents the need to redraw all elements on every mouse movement, which is a major performance bottleneck in canvas applications.

### 2. State Machine for Interactions

All user interactions are managed by a central state machine within the `useInteractions.ts` hook. The `action` state variable (e.g., `'drawing'`, `'resizing'`, `'panning'`, `'none'`) determines what logic is executed on pointer events. This makes the interaction logic predictable and easy to debug.

### 3. Controlled vs. Uncontrolled Component

The `CanvasWhiteboard` can be used as both a controlled and an uncontrolled component, similar to how form inputs work in React.

- **Uncontrolled (Default)**: If you don't pass the `elements` prop, the component manages its own state internally using `useState`. It can also persist the state to `localStorage`.
- **Controlled**: If you pass the `elements` and `onElementsChange` props, the parent component is responsible for managing the state. This is useful for integrating the whiteboard with a larger application state, like a real-time collaboration backend.

### 4. Element Data Structure

All items on the canvas (rectangles, lines, text, etc.) are represented as plain JavaScript objects. Their shapes and properties are defined by TypeScript interfaces in `types.ts`. This makes them easy to create, serialize, and manipulate.

### 5. Viewport Management (Pan & Zoom)

The component supports an "infinite canvas" feel through panning and zooming. This is managed by a `viewTransform` state object (`{ scale, offsetX, offsetY }`) that is applied to the canvas context before rendering.

**User Controls:**

- **Pan**:
  - Hold `Spacebar` and drag the mouse.
  - Use the mouse wheel to pan vertically.
  - Hold `Shift` and use the mouse wheel to pan horizontally.
  - Use a two-finger drag on a trackpad.
- **Zoom**:
  - Hold `Ctrl` and use the mouse wheel. The zoom is centered on the cursor's position for a natural feel.

This functionality can be enabled or disabled via the `enableZoomPan` prop.

---

## File Structure Breakdown

Here's a guide to the most important files in the `CanvasWhiteboard` directory:

#### `index.tsx`

- **Role**: The main component and entry point.
- **Responsibilities**:
  - Manages the component's state (both internal and controlled).
  - Initializes all the custom hooks (`useInteractions`, `useDrawing`, `useKeyboard`, etc.).
  - Renders the canvas elements, the `Toolbar`, and the `Stylebar`.
  - Connects all the pieces together.

#### `useInteractions.ts`

- **Role**: The "brain" of the whiteboard.
- **Responsibilities**:
  - Contains the state machine (`action` state) for all user interactions.
  - Handles all pointer events (`handlePointerDown`, `handlePointerMove`, `handlePointerUp`) and keyboard state (`isSpacePressed`).
  - Determines whether an interaction is a draw, select, drag, resize, rotate, pan, or wire action.
  - Contains the `createElement` factory for creating new element objects.

#### `useDrawing.ts`

- **Role**: The "renderer".
- **Responsibilities**:
  - Uses a `useLayoutEffect` to draw onto the two canvases.
  - Draws non-selected elements to the `staticCanvas`.
  - Draws selected elements, handles, selection boxes, and other real-time feedback to the `activeCanvas`.
  - Contains the core `drawElement` function, which knows how to render every type of element based on its properties (stroke, fill, rotation, etc.).

#### `element.ts`

- **Role**: The element utility library.
- **Responsibilities**:
  - Contains pure functions for working with element objects.
  - `getElementAtPosition`: The core hit-testing logic.
  - `resizeElement`, `moveElement`: Logic for transforming elements.
  - `getHandles`, `hitTestHandle`: Logic for finding and interacting with selection handles.
  - `getElementBounds`: Calculates the axis-aligned bounding box for any element, accounting for rotation.

#### `geometry.ts`

- **Role**: The low-level math library.
- **Responsibilities**:
  - Contains pure, generic functions for geometric calculations.
  - `rotatePoint`, `distanceToLineSegment`, `getQuadraticCurveBounds`, etc.
  - These functions have no knowledge of "elements"; they just work with points and numbers.

#### `types.ts`

- **Role**: The data dictionary.
- **Responsibilities**:
  - Defines all the TypeScript interfaces for the different element types (`RectangleElement`, `LineElement`, etc.).
  - Defines other important types like `Action`, `HandleType`, and `Point`.

#### `Toolbar.tsx`

- **Role**: The main tool selection UI.
- **Responsibilities**:
  - Renders the icon-based buttons for each tool (select, rectangle, pencil, etc.).
  - Updates the `selectedTool` state in the parent component.

#### `Stylebar.tsx`

- **Role**: The contextual styling UI.
- **Responsibilities**:
  - Appears when one or more elements are selected.
  - Provides controls (color pickers, sliders) to modify the properties (`stroke`, `fill`, `opacity`, etc.) of the selected elements.

---

## How an Interaction Works: Drawing a Rectangle

To understand how the pieces fit together, let's trace a simple user interaction:

1.  **Tool Selection**: The user clicks the "Rectangle" icon in the `Toolbar`. This calls `setSelectedTool('rectangle')`, updating the state in `index.tsx`.

2.  **Pointer Down**: The user clicks and holds the mouse button on the `activeCanvas`.
    - The `onPointerDown` event fires, calling `handlePointerDown` in `useInteractions.ts`.
    - `handlePointerDown` sees that `selectedTool` is `'rectangle'` and calls `handleDrawingInteraction`.
    - `handleDrawingInteraction` calls the `createElement('rectangle', ...)` factory to create a new rectangle object with `width: 0` and `height: 0`.
    - This new element is placed in the `selectedElements` state, and the `action` state is set to `'drawing'`.

3.  **Pointer Move**: The user drags the mouse across the canvas.
    - The `onPointerMove` event fires continuously, calling `handlePointerMove`.
    - `handlePointerMove` sees that `action` is `'drawing'`. It calculates the new `width` and `height` based on the mouse position and updates the rectangle object in the `selectedElements` state.
    - The `useDrawing` hook detects the change in `selectedElements`. On each animation frame, it clears the `activeCanvas` and redraws the selected rectangle with its new dimensions, providing real-time feedback. The `staticCanvas` is not touched.

4.  **Pointer Up**: The user releases the mouse button.
    - The `onPointerUp` event fires, calling `handlePointerUp`.
    - `handlePointerUp` sees that `action` was `'drawing'`. It takes the finalized element from `selectedElements` and calls `updateElements` to add it to the main `elements` array.
    - It then resets the `action` state to `'none'` and, for a better workflow, sets the `selectedTool` back to `'selection'`.

5.  **Final Render**:
    - The `useDrawing` hook now sees the updated `elements` array and the empty `selectedElements` array.
    - On the next render cycle, it draws the new, finalized rectangle onto the `staticCanvas`.
    - The `activeCanvas` is now clear, and the new rectangle is part of the persistent drawing.
