import { STORAGE_KEY, LEGACY_STORAGE_KEY, THEMES, THEME_META } from "./themes";

/**
 * Inline script that runs in <head> before first paint, so there is no flash
 * of the wrong theme. It mirrors applyTheme() in ThemeProvider.
 * Stored value: a theme id or "system". Nothing stored means System.
 */
export function themeBootScript(): string {
  const data = JSON.stringify({
    key: STORAGE_KEY,
    legacy: LEGACY_STORAGE_KEY,
    meta: THEME_META,
    dark: Object.fromEntries(THEMES.map((t) => [t.id, t.dark])),
  });
  return `(function(){try{var d=${data};var s=null;try{s=localStorage.getItem(d.key)||localStorage.getItem(d.legacy)}catch(e){}
var pd=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;
var id=(s&&d.meta[s])?s:(pd?"dark":"light");
var r=document.documentElement;var m=d.meta[id];var dk=!!d.dark[id];
r.dataset.theme=dk?"dark":"light";r.dataset.accent=id;r.style.colorScheme=dk?"dark":"light";
r.style.setProperty("--accent",m.accent);
var q=document.querySelectorAll('meta[name="theme-color"]');
if(q.length){for(var i=0;i<q.length;i++){q[i].setAttribute("content",m.bg)}}
else{var t=document.createElement("meta");t.name="theme-color";t.content=m.bg;document.head.appendChild(t)}
}catch(e){}})();`;
}
