import type { NamedSSRLoadedRendererValue } from 'astro';
import { AstroError } from 'astro/errors';
import { AstroJSX, jsx } from 'astro/jsx-runtime';
import { renderJSX } from 'astro/runtime/server/index.js';

const slotName = (str: string) => str.trim().replace(/[-_]([a-z])/g, (_, w) => w.toUpperCase());

// This check function is used to determine if the component is rendered by this renderer
export async function check(
  Component: any,
  props: any,
  { default: children = null, ...slotted } = {},
) {
  if (typeof Component !== 'function') return false;
  const slots: Record<string, any> = {};
  for (const [key, value] of Object.entries(slotted)) {
    const name = slotName(key);
    slots[name] = value;
  }
  try {
    const result = await Component({ ...props, ...slots, children });
    return result[AstroJSX];
  } catch (e) {
    throwEnhancedErrorIfOrgComponent(e as Error, Component);
  }
  return false;
}

export async function renderToStaticMarkup(
  this: any,
  Component: any,
  props = {},
  { default: children = null, ...slotted } = {},
) {
  const slots: Record<string, any> = {};
  for (const [key, value] of Object.entries(slotted)) {
    const name = slotName(key);
    slots[name] = value;
  }

  const { result } = this;
  try {
    const html = await renderJSX(result, jsx(Component, { ...props, ...slots, children }));
    return { html };
  } catch (e) {
    throwEnhancedErrorIfOrgComponent(e as Error, Component);
    throw e;
  }
}

function throwEnhancedErrorIfOrgComponent(error: Error, Component: any) {
  // if the exception is from an org component
  // throw an error
  if (Component[Symbol.for('org-component')]) {
    // if it's an existing AstroError, we don't need to re-throw, keep the original hint
    if (AstroError.is(error)) return;
    // Provide better title and hint for the error overlay
    (error as any).title = error.name;
    (error as any).hint =
      `This issue often occurs when your Org component encounters runtime errors.`;
    throw error;
  }
}

const renderer: NamedSSRLoadedRendererValue = {
  name: 'astro:jsx',
  check,
  renderToStaticMarkup,
};

export default renderer; 