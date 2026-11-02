// Herdr draws an SVG at the size its own width/height say, then scales the picture:
// huge sizes come out jagged, tiny ones blurry. This rewrites the root <svg> tag so
// its size is the size it's drawn at, which comes out smooth.
// Returns the new SVG text, or null when the size can't be worked out.
export function sizeSvg(text, height) {
  const tag = text.match(/<svg\b[^>]*>/i)?.[0];
  if (!tag) return null;
  const attr = (name) => tag.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1];
  const box = attr("viewBox")?.trim().split(/[\s,]+/).map(Number);
  // Only plain lengths: "100%" or "10em" say nothing about the drawing's shape.
  const len = (v) => (/^\s*[\d.]+(px)?\s*$/.test(v ?? "") ? parseFloat(v) : NaN);
  const [w0, h0] = box?.length === 4 ? [box[2], box[3]] : [len(attr("width")), len(attr("height"))];
  if (!(w0 > 0 && h0 > 0)) return null;
  const width = Math.round((height * w0) / h0 * 100) / 100;
  // Without a viewBox the old width/height were the drawing's coordinates: keep them as one.
  const viewBox = box?.length === 4 ? "" : ` viewBox="0 0 ${w0} ${h0}"`;
  const bare = tag.replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*')/gi, "");
  return text.replace(tag, bare.replace(/^<svg/i, `<svg width="${width}" height="${height}"${viewBox}`));
}
