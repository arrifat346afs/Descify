/**
 * Theme auto-discovery system.
 *
 * Themes are defined exclusively in App.css as [data-theme='name'] attribute
 * selectors. This module scans document.styleSheets at runtime to find them —
 * no manual registration needed. Just add a new [data-theme='...'] block to
 * App.css and it appears automatically in the theme picker.
 *
 * Metadata (label, description) is stored as CSS custom properties inside each
 * theme block:
 *   --theme-label: 'My Theme';
 *   --theme-description: 'A short description';
 */

export type ThemeId = string;
export type ColorMode = "light" | "dark";

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  description: string;
}

/** Regex that matches exactly [data-theme='id'] or [data-theme="id"] — no extra combinators. */
const THEME_SELECTOR_RE = /^\[data-theme=['"]([^'"]+)['"]\]$/;

/**
 * Scans all loaded stylesheets for [data-theme='...'] selectors (excluding
 * dark variants like [data-theme='ocean'].dark) and builds the list of
 * available themes by reading --theme-label / --theme-description from each.
 *
 * Safe to call synchronously after the DOM is ready (e.g. in useState initializer
 * or useEffect). In a Tauri / Vite app the bundled stylesheet is always same-origin.
 */
export function discoverThemes(): ThemeDefinition[] {
  const themes: ThemeDefinition[] = [];
  const seenIds = new Set<string>();

  try {
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        // Cross-origin sheet — skip
        continue;
      }

      for (const rule of Array.from(rules)) {
        if (!(rule instanceof CSSStyleRule)) continue;

        // A rule may have multiple comma-separated selectors
        const selectors = rule.selectorText.split(",").map((s) => s.trim());
        for (const sel of selectors) {
          const match = THEME_SELECTOR_RE.exec(sel);
          if (!match) continue;

          const id = match[1];
          if (seenIds.has(id)) continue;
          seenIds.add(id);

          // Read metadata directly from the CSS rule's declared properties.
          // This avoids inheritance — getComputedStyle would walk up the DOM and
          // pick up --theme-label from the active theme on <html> if the new theme
          // block doesn't define its own label.
          const ruleStyle = (rule as CSSStyleRule).style;
          const rawLabel = ruleStyle.getPropertyValue("--theme-label").trim().replace(/^['"]|['"]$/g, "");
          const rawDesc  = ruleStyle.getPropertyValue("--theme-description").trim().replace(/^['"]|['"]$/g, "");

          // Fall back to deriving a pretty name from the id if no label is declared
          const label = rawLabel || id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          const description = rawDesc || "";

          themes.push({ id, label, description });
        }
      }
    }
  } catch {
    // Defensive catch — return whatever we collected so far
  }

  return themes;
}

