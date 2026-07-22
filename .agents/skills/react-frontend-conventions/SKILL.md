---
name: react-frontend-conventions
description: Enforce this repository's React 19, React Compiler-first TypeScript frontend conventions. Use when creating, editing, reviewing, or refactoring files under src/, especially components, hooks, durable form edits, optimistic persistence, rollback and toast behavior, import/export coordination, asynchronous updates, effects, memoization, or diagram UI.
---

# React Frontend Conventions

Apply these rules to every frontend change in this repository. Preserve behavior while relying on React Compiler for routine memoization and improving component boundaries and React scheduling.

## Inspect Before Editing

1. Read the affected page and nearby components, hooks, types, styles, and tests.
2. Check the installed `react`, `react-dom`, TypeScript, and lint versions before using an API.
3. Treat React 19 as the target. Verify that the installed React version exports `useEffectEvent` before importing it. If it does not, update React when dependency changes are in scope; otherwise report the version mismatch instead of adding uncompilable code.
4. Run the repository's existing build, typecheck, lint, and relevant tests after editing.

## Prefer React Compiler Memoization

Treat React Compiler as the default memoization mechanism. Keep it enabled through `reactCompilerPreset()` in `vite.config.ts`, and preserve the compiler dependencies in `devDependencies`.

Write plain functions and derived values inside components unless manual identity stability is required for correctness or a measured performance issue remains after compilation. Do not add `useCallback` merely because a function is passed to a child, used as a DOM event handler, or returned from a hook. Do not add `useMemo` merely to cache an object, array, lookup, filter, or other render-time derivation.

Remove existing `useCallback` and `useMemo` incrementally when touching a file. Preserve manual memoization only when its stable identity is an observable contract, including an Effect dependency that must not re-synchronize, an external subscription or imperative API that requires the same function or object, or a third-party integration with a documented identity requirement. Prefer restructuring the Effect or moving constants and pure helpers to module scope before retaining manual memoization.

Do not remove semantic APIs such as `useState` lazy initialization, `useEffectEvent`, `useRef`, `useTransition`, or `React.memo` without checking their separate purpose. Verify compiler output through a production build; if the compiler skips a component, fix Rules of React violations instead of restoring blanket memoization.

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

## Keep Dialog Backdrops Consistent

Apply the shared dialog treatment to every modal implementation, including native `<dialog>`, daisyUI `.modal`, and custom fixed overlays. Do not introduce component-specific backdrop colors or omit the backdrop.

- Use `rgb(15 23 42 / 0.42)` for the backdrop and `blur(2px)` for `backdrop-filter`.
- Keep the shared selectors in `src/styles.css`: `dialog::backdrop` for native dialogs, `.modal.modal-open` for daisyUI modals, and `.dialog-overlay` for custom fixed overlays.
- Add `.dialog-overlay` to new custom modal roots instead of duplicating backdrop utilities in JSX.
- Use the Field dialog surface as the visual baseline: a white surface with `shadow-2xl`; keep daisyUI `.modal-box` on the equivalent shared shadow.
- When replacing or opening another top-level modal, close the current modal first unless the new modal is an intentional nested workflow.

Verify at least one modal from each implementation style touched by the change. Confirm the computed backdrop color, `blur(2px)`, surface shadow, and that no previous modal remains behind a replacement modal.

## Write Callbacks for the Compiler

Declare ordinary frontend callbacks as plain functions. This includes DOM event handlers and callbacks passed to compiler-processed children.

Use functional state updates when a callback only needs the previous value:

```tsx
function handleToggleSidebar() {
  setSidebarOpen((open) => !open);
}
```

Use functional state updates when a callback only needs the previous value. Keep pure module-level functions outside the component. For callbacks used by Effects, subscriptions, timers, or imperative APIs, first decide whether the logic belongs in the Effect, an Effect Event, or a module-level function. Retain `useCallback` only when stable identity is part of that integration's correctness contract, and list every reactive value it reads.

## Mark Expensive or Asynchronous Updates as Transitions

Do not use a transition for callbacks that only read or write small local UI state, such as toggling a menu, selecting an item, or editing a controlled input.

When a callback performs asynchronous work, bulk model changes, expensive derivation, diagram regeneration, import/export processing, or another update that may block interaction, keep urgent feedback outside the transition and mark non-urgent React state updates with `startTransition` or `useTransition`:

```tsx
async function handleImport(file: File) {
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
}
```

Use `useTransition` when the UI needs an `isPending` state. Keep controlled-input updates urgent. Remember that a transition prioritizes React updates; it does not move CPU-intensive work off the main thread. Use a worker or another appropriate mechanism when computation itself must be offloaded.

If a state update occurs after an `await`, place that update in its own `startTransition` call unless the installed React version explicitly guarantees the desired async Action semantics.

## Make Durable Edits Transactional and Observable

Treat persisted project data as confirmed state, not as ordinary local component state. Every durable edit must have one explicit commit boundary, return a result, and expose failure to the user.

- Keep controlled keystrokes in urgent local draft state. Do not wrap each `onChange` in a transition.
- Commit on an intentional boundary such as blur, form submit, or an explicit debounced autosave. Document which boundary the control uses.
- Make mutation functions return `Promise<boolean>` or a typed result. Never discard them with `void` when correctness depends on persistence.
- Do not update canonical local stores before persistence succeeds. In particular, do not use `setLocal(next); void save(next)` for durable data.
- Let the persistence/collaboration layer publish the accepted canonical state before resolving success.
- Use one app-level toast queue or provider for mutation feedback. Emit one contextual error toast at the mutation owner; avoid `window.alert` and duplicate notifications in child and parent layers.

Use `useOptimistic` for the visible committed value while a durable mutation is pending. Start the optimistic mutation inside a React 19 Transition Action so React restores the confirmed base value automatically when the Action fails or completes without a matching canonical update:

```tsx
const [isPending, startTransition] = useTransition();
const [optimisticModel, addOptimisticPatch] = useOptimistic(
  model,
  (current, patch: Partial<ModelSeed>) => ({ ...current, ...patch })
);

function commitDescription(description: string) {
  const patch = { description };
  startTransition(async () => {
    addOptimisticPatch(patch);
    try {
      if (!(await onSave(patch))) {
        toast.error("The note could not be saved. Your last confirmed value was restored.");
      }
    } catch (error) {
      toast.error(toMutationError(error, "The note could not be saved. Your last confirmed value was restored."));
    }
  });
}
```

Render the pending committed value from `optimisticModel`. Keep a separate draft only while the user is actively typing; after commit, synchronize that draft from the optimistic/confirmed value without overwriting a newly focused edit. Use `isPending` for subtle progress and duplicate-submit prevention, not for blocking unrelated input.

If edits can overlap, serialize them per entity or attach a mutation/version identifier so an older completion cannot replace a newer edit. Test rejection, thrown errors, delayed success, and out-of-order completion.

### Coordinate Drafts, Navigation, and Export

Do not depend on browser blur/click ordering to persist data.

- Before export, project switching, or another action that snapshots canonical data, explicitly flush the active draft and await all pending durable mutations.
- Abort the snapshot/action and show an error toast when a required flush fails.
- Make dialog semantics explicit: Save awaits persistence; Cancel discards the draft. Warn before silently closing a dirty dialog when loss would be surprising.
- Prefer controlled durable fields over `defaultValue` plus `onBlur`; uncontrolled DOM values cannot participate reliably in rollback or pending-state UI.
- Keep export and save operations behind the same mutation barrier or queue so snapshots cannot observe an older confirmed state.

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
- Dialogs use the shared backdrop, blur, and surface shadow without component-specific variants.
- React Compiler remains enabled and the production build compiles successfully.
- Edited components avoid routine `useCallback` and `useMemo`; any retained manual memoization has a correctness or measured-performance justification.
- Expensive or asynchronous non-urgent state updates use transitions, while urgent local interactions do not.
- Durable edits use confirmed base state plus `useOptimistic`; failed saves visibly roll back and emit one error toast.
- No correctness-sensitive save promise is discarded, and canonical stores are not updated before acceptance.
- Export, project switching, and dialog close behavior account for dirty drafts and pending durable mutations.
- Effects depend only on true synchronization triggers, with latest-value reads isolated through `useEffectEvent` where appropriate.
- React API usage matches the installed runtime and types.
- The build, typecheck, lint, and relevant tests pass.
