export function openWorkspaceImmediately(
  workspaceIsOpen: boolean,
  onOpen: () => void
): void {
  if (workspaceIsOpen) return;
  onOpen();
}
