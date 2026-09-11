type Child = Node | string | null | undefined | false;

/** Tiny DOM builder: el('div', { class: 'x', onclick: fn }, 'text', node). */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, unknown> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2), value as EventListener);
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(node.style, value);
    } else if (key in node && key !== 'class') {
      (node as unknown as Record<string, unknown>)[key] = value;
    } else {
      node.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }
  return node;
}

export function button(
  label: string,
  onClick: () => void,
  opts: { primary?: boolean; disabled?: boolean; class?: string } = {},
): HTMLButtonElement {
  return el(
    'button',
    {
      type: 'button',
      class: ['btn', opts.primary && 'btn-primary', opts.class].filter(Boolean).join(' '),
      disabled: opts.disabled ?? false,
      onclick: onClick,
    },
    label,
  );
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}
