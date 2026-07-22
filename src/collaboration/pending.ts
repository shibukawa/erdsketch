export async function waitForStablePending(getPending: () => Promise<unknown>) {
  while (true) {
    const pending = getPending();
    await pending;
    if (pending === getPending()) return;
  }
}
