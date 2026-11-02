import { View, div, image, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { theme, run, props, window, shared, setShared, layout } from "herdr";

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

export default class CustomBrand extends View {
  button(id, icon, action) {
    const t = theme();
    return div().id(id).size(26).flex_none().flex().items_center().justify_center().rounded(6).text_color(t.muted)
      .hover(s => s.bg(t.hover).text_color(t.foreground))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click(action)
      .child(svg(`mods/custom-brand/${icon}.svg`).size(15));
  }

  brand() {
    const t = theme();
    const { name, logo, logo_height } = { ...DEFAULTS, ...props() };
    // Height only: the image keeps its own aspect ratio, square, wide or tall.
    const mark = image(logo).h(logo_height ?? (name ? 24 : 18)).flex_none();
    // When space runs out, "Powered by" gives way first; Herdr's icon and name never do.
    const byline = h_flex().min_w(0).gap(3).items_center().text_size(10.5).text_color(t.dim)
      .child(div().min_w(0).truncate().child("Powered by"))
      .child(image("frame/welcome/herdr.png").size(12).flex_none().rounded(3))
      .child(div().flex_none().text_color(t.muted).child("Herdr"));
    // No name: a wordmark logo, stacked over the byline.
    if (!name) return v_flex().flex_1().min_w(0).overflow_hidden().items_start().gap(3).child(mark).child(byline);
    return h_flex().flex_1().min_w(0).overflow_hidden().gap(8).items_center()
      .child(mark)
      .child(v_flex().min_w(0).gap(1)
        .child(div().text_size(13.5).font_semibold().text_color(t.foreground).truncate().child(name))
        .child(byline));
  }

  render() {
    const t = theme();
    const collapsed = narrow();
    const mac = window()?.platform === "macos";
    const search = () => this.button("search", "search", () => run("mod.open", { name: "picker" }));
    const toggle = () => this.button("sidebar-toggle", "sidebar", toggleSidebar);
    const root = (el) => el.id("root").size_full().bg(t.chrome)
      .on_size_change((size, cx) => { this.height = size.height; cx.notify(); });
    // A tall block (72px+) gets two rows: buttons beside the window controls, the brand under them at the left edge.
    if (!collapsed && (this.height ?? 0) >= 72) {
      return root(v_flex())
        .child(h_flex().h(44).flex_none().pr(10).gap(4).items_center().justify_end().child(search()).child(toggle()))
        .child(h_flex().flex_1().min_h(0).px(16).pb(6).items_center().child(this.brand()));
    }
    return root(h_flex()).pl(collapsed ? 6 : 14).pr(10).gap(4).items_center()
      .when(mac && !collapsed, el => el.pl(76))
      .when(!collapsed, el => el.child(this.brand()).child(search()))
      // On the macOS rail the traffic lights fill the row; the agents list's » unfolds it.
      .when(!(collapsed && mac), el => el.child(toggle()));
  }
}
