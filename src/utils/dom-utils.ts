// utils/dom-utils.ts - DOM utility functions for Viwoods Obsidian Plugin

/**
 * Set multiple CSS properties on an element at once
 * This is a utility function to replace direct element.style.xxx assignments
 */
export function setCssProps(el: HTMLElement | SVGElement, props: Record<string, string>): void {
    for (const [key, value] of Object.entries(props)) {
        el.style.setProperty(key, value);
    }
}
