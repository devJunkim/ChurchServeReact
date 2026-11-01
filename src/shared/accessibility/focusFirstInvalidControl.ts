export function focusFirstInvalidControl(root: ParentNode): void {
  root
    .querySelector<HTMLElement>('[aria-invalid="true"]')
    ?.focus()
}
