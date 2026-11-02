import { View, div, image, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import * as fs from "fs/promises";
import { theme, run, props, window, shared, setShared, layout, settings, appHome, readTextFile } from "herdr";
import { sizeSvg } from "./sized.js";

// Your brand, from the block's props; the byline below it always credits Herdr.
const DEFAULTS = { name: "Acme", logo: "mods/custom-brand/logo.svg" };

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

// Same rail rule as workspace-chrome: the sidebar is a rail below 160px.
const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 160;

function toggleSidebar() {
  const width = find(layout(), "sidebar")?.size?.px;
  if (!narrow()) setShared("sidebar.width", width);
  setShared("sidebar.collapsed", !narrow());
  run("layout.resize", { id: "sidebar", px: narrow() ? (shared("sidebar.width") ?? 268) : window()?.platform === "macos" ? 76 : 44 });
}

const findMod = (node) => node?.content?.mod === "custom-brand" ? node
  : (node?.children ?? []).map(findMod).find(Boolean) ?? null;

// Full screen hides the macOS traffic lights, so the brand fits beside the buttons:
// shrink the block to one row (COMPACT) and give its height back on leaving full screen.
// shortcut: acts on the first custom-brand block in the layout; fine while there's one.
const COMPACT = 58; // one row with the tallest default logo (30px) and room above it

function fitHeight(fullscreen) {
  const node = findMod(layout());
  const px = node?.size?.px;
  if (!node?.id || !px) return;
  const key = `custom-brand.height.${shared("layout")}`;
  const saved = shared(key);
  if (fullscreen && px > COMPACT) {
    setShared(key, px);
    run("layout.resize", { id: node.id, px: COMPACT });
  } else if (!fullscreen && saved && px === COMPACT) {
    setShared(key, null);
    run("layout.resize", { id: node.id, px: saved });
  }
}

// Hidden, so writing it doesn't reload the mod.
const SIZED = "mods/custom-brand/.sized";

export default class CustomBrand extends View {
  // An SVG logo, redrawn at the size it's shown (see sized.js); the original until it's ready.
  // shortcut: made once per copy, so an edited logo file shows after the mod reloads.
  logoAt(logo, height, cx) {
    if (!/\.svg$/i.test(logo)) return logo;
    const px = height * Number(settings().zoom ?? 1);
    const key = `${logo}@${px}`;
    this.sized ??= {};
    if (!(key in this.sized)) {
      this.sized[key] = logo;
      cx.spawn(async (cx) => {
        try {
          const svg = sizeSvg((await readTextFile(`${appHome()}/${logo}`)) ?? "", px);
          if (!svg) return;
          const out = `${SIZED}/${logo.replace(/[^\w.-]+/g, "_")}@${px}.svg`;
          await fs.mkdir(`${appHome()}/${SIZED}`, { recursive: true });
          await fs.writeFile(`${appHome()}/${out}`, svg);
          this.sized[key] = out;
          cx.notify();
        } catch (e) {
          console.log(`custom-brand: drawing ${logo} as is: ${e}`);
        }
      });
    }
    return this.sized[key];
  }

  button(id, icon, action) {
    const t = theme();
    return div().id(id).size(26).flex_none().flex().items_center().justify_center().rounded(6).text_color(t.muted)
      .hover(s => s.bg(t.hover).text_color(t.foreground))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click(action)
      .child(svg(`mods/custom-brand/${icon}.svg`).size(15));
  }

  brand(cx) {
    const t = theme();
    const { name, logo, logo_height } = { ...DEFAULTS, ...props() };
    const height = logo_height ?? (name ? 30 : 24);
    // Height only: the image keeps its own aspect ratio, square, wide or tall.
    const mark = image(this.logoAt(logo, height, cx)).h(height).max_w("100%").flex_none();
    // When space runs out, "Powered by" gives way first; Herdr's icon and name never do.
    const byline = h_flex().min_w(0).gap(3).items_center().text_size(10.5).line_height(1.2).text_color(t.dim)
      .child(div().min_w(0).truncate().child("Powered by"))
      .child(image("frame/welcome/herdr.png").size(12).flex_none().rounded(3))
      .child(div().flex_none().text_color(t.muted).child("Herdr"));
    // No name: a wordmark logo, stacked over the byline.
    if (!name) return v_flex().flex_1().min_w(0).overflow_hidden().items_start().gap(3).child(mark).child(byline);
    return h_flex().flex_1().min_w(0).overflow_hidden().gap(8).items_center()
      .child(mark)
      .child(v_flex().min_w(0).gap(1)
        .child(div().text_size(13.5).line_height(1.2).font_semibold().text_color(t.foreground).truncate().child(name))
        .child(byline));
  }

  render(cx) {
    const t = theme();
    const collapsed = narrow();
    const mac = window()?.platform === "macos";
    const fullscreen = Boolean(window()?.fullscreen);
    fitHeight(fullscreen);
    const search = () => this.button("search", "search", () => run("mod.open", { name: "picker" }));
    const toggle = () => this.button("sidebar-toggle", "sidebar", toggleSidebar);
    const root = (el) => el.id("root").size_full().bg(t.chrome)
      .on_size_change((size, cx) => { this.height = size.height; cx.notify(); });
    // A tall block (72px+) gets two rows: buttons beside the window controls, the brand under them at the left edge.
    if (!collapsed && !fullscreen && (this.height ?? 0) >= 72) {
      return root(v_flex())
        .child(h_flex().h(44).flex_none().pr(10).gap(4).items_center().justify_end().child(search()).child(toggle()))
        .child(h_flex().flex_1().min_h(0).px(16).pb(6).items_center().child(this.brand(cx)));
    }
    return root(h_flex()).pl(collapsed ? 6 : 14).pr(10).gap(4).items_center()
      .when(mac && !collapsed && !fullscreen, el => el.pl(76))
      .when(fullscreen && !collapsed, el => el.pl(16))
      .when(!collapsed, el => el.child(this.brand(cx)).child(search()))
      // On the macOS rail the traffic lights fill the row; the agents list's » unfolds it.
      .when(!(collapsed && mac), el => el.child(toggle()));
  }
}
