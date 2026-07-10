---
name: react-frontend-conventions
description: Enforce this repository's React and TypeScript frontend structure and hook conventions. Use when creating, editing, reviewing, or refactoring React pages, components, hooks, event handlers, effects, diagram UI, or other files under src/; especially use when splitting large components, adding callbacks, introducing asynchronous or expensive UI work, or changing useEffect logic.
---

# React Frontend Conventions

Apply these rules to every frontend change in this repository. Preserve behavior while improving component boundaries and React scheduling.

## Inspect Before Editing

1. Read the affected page and nearby components, hooks, types, styles, and tests.
2. Check the installed `react`, `react-dom`, TypeScript, and lint versions before using an API.
3. Treat React 19 as the target. Verify that the installed React version exports `useEffectEvent` before importing it. If it does not, update React when dependency changes are in scope; otherwise report the version mismatch instead of adding uncompilable code.
4. Run the repository's existing build, typecheck, lint, and relevant tests after editing.

## Split Pages by Responsibility

Do not leave a page as one large file. Keep the page component focused on composition and page-level state coordination.

Extract cohesive UI regions into separate files, including:

- Header
- Footer
- Sidebar and sidebar sections
- Diagram canvas
- Diagram nodes, links, controls, and other independently understandable diagram elements

Place reusable layout components under `src/components/layout/` and diagram-specific components under `src/components/diagram/`, unless the repository already has a clearer local convention. Keep component-specific types, constants, helpers, and styles close to their owner. Move shared types, hooks, and pure utilities to dedicated files only when multiple components consume them.

Prefer one primary React component per file. Give files and components descriptive PascalCase names. Avoid meaningless fragments and tiny extractions that do not create a clear responsibility boundary.

## Stabilize Callbacks

Wrap frontend callbacks declared inside React components in `useCallback`. This includes DOM event handlers, callbacks passed to children, timers, subscriptions, and callbacks returned from hooks.

Use functional state updates when a callback only needs the previous value:

```tsx
const handleToggleSidebar = useCallback(() => {
  setSidebarOpen((open) => !open);
}, []);
```

List every reactive value read by the callback in its dependency array. Do not suppress hook dependency warnings or use `useCallback` to conceal stale closures. Keep pure module-level functions outside the component instead of wrapping them.

## Mark Expensive or Asynchronous Updates as Transitions

Do not use a transition for callbacks that only read or write small local UI state, such as toggling a menu, selecting an item, or editing a controlled input.

When a callback performs asynchronous work, bulk model changes, expensive derivation, diagram regeneration, import/export processing, or another update that may block interaction, keep urgent feedback outside the transition and mark non-urgent React state updates with `startTransition` or `useTransition`:

```tsx
const handleImport = useCallback(async (file: File) => {
  setImportError(null);

  try {
    const nextModel = await parseModel(file);
    startTransition(() => {
      setModel(nextModel);
      setSelection(null);
    });
  } catch (error) {
    setImportError(toErrorMessage(error));
  }
}, []);
```

Use `useTransition` when the UI needs an `isPending` state. Keep controlled-input updates urgent. Remember that a transition prioritizes React updates; it does not move CPU-intensive work off the main thread. Use a worker or another appropriate mechanism when computation itself must be offloaded.

If a state update occurs after an `await`, place that update in its own `startTransition` call unless the installed React version explicitly guarantees the desired async Action semantics.

## Separate Effect Triggers from Latest Values

Use React 19 `useEffectEvent` for logic called by an Effect that must read the latest props or state without causing the Effect to re-synchronize.

```tsx
const onViewportChanged = useEffectEvent(() => {
  persistViewport(viewport, activeModelId);
});

useEffect(() => {
  const unsubscribe = viewportStore.subscribe(onViewportChanged);
  return unsubscribe;
}, [viewportStore]);
```

Keep only genuine synchronization triggers in the Effect dependency list. Move latest-value reads and event-like Effect logic into an Effect Event.

Do not use `useEffectEvent` to hide a dependency that should re-run synchronization. Do not call an Effect Event from render or ordinary user-event handlers. Keep setup and cleanup symmetrical, and never disable exhaustive-deps to force a preferred dependency list.

## Review Checklist

Before finishing, verify that:

- No edited page remains a monolith when layout or diagram responsibilities can be named and extracted.
- Header, footer, sidebar, and diagram elements have clear file boundaries where present.
- Component-local callbacks use `useCallback` with correct dependencies.
- Expensive or asynchronous non-urgent state updates use transitions, while urgent local interactions do not.
- Effects depend only on true synchronization triggers, with latest-value reads isolated through `useEffectEvent` where appropriate.
- React API usage matches the installed runtime and types.
- The build, typecheck, lint, and relevant tests pass.
