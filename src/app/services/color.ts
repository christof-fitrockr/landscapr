/**
 * Turning the colour of a role into a surface somebody can read.
 *
 * A role carries a colour so that a reader can tell one lane from another. That
 * is a mark of identity, not a background: painted across a whole box at full
 * strength it swallows the label, and every colour a user picks needs its own
 * decision about whether the text on top should be dark or light.
 *
 * So the colour is used as a tint. The box is mostly white with a trace of the
 * role in it, the border and the edge carry the colour at full strength, and the
 * label stays the same dark grey as everywhere else in the app - which stays
 * readable whatever colour anybody chooses.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** What a box painted for one role looks like */
export interface Surface {
  fill: string;
  border: string;
  /** the role colour at full strength, for the stripe that identifies the lane */
  accent: string;
  text: string;
}

const DARK_TEXT = '#374151';
const LIGHT_TEXT = '#ffffff';

/**
 * Reads a colour the way a stylesheet writes one. Returns null for anything it
 * cannot read, so a caller can fall back rather than hand nonsense to a canvas -
 * which would silently keep painting in whatever colour came before.
 */
export function parseColor(color: string): Rgb | null {
  const value = String(color || '').trim().toLowerCase();
  if (!value) return null;

  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(value);
  if (short) {
    return {
      r: parseInt(short[1] + short[1], 16),
      g: parseInt(short[2] + short[2], 16),
      b: parseInt(short[3] + short[3], 16)
    };
  }

  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(value);
  if (long) {
    return { r: parseInt(long[1], 16), g: parseInt(long[2], 16), b: parseInt(long[3], 16) };
  }

  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(value);
  if (rgb) {
    return { r: clampChannel(+rgb[1]), g: clampChannel(+rgb[2]), b: clampChannel(+rgb[3]) };
  }

  return null;
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value || 0)));
}

export function toHex(color: Rgb): string {
  const part = (value: number) => clampChannel(value).toString(16).padStart(2, '0');
  return '#' + part(color.r) + part(color.g) + part(color.b);
}

/** Moves a colour towards another one; 0 keeps it, 1 replaces it */
export function mix(color: Rgb, towards: Rgb, amount: number): Rgb {
  const ratio = Math.max(0, Math.min(1, amount));
  return {
    r: color.r + (towards.r - color.r) * ratio,
    g: color.g + (towards.g - color.g) * ratio,
    b: color.b + (towards.b - color.b) * ratio
  };
}

/** How bright a colour looks, 0 for black and 1 for white */
export function luminance(color: Rgb): number {
  const channel = (value: number) => {
    const scaled = value / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

/** Dark or light text, whichever stands out on this background */
export function readableTextOn(color: string, fallback: string = DARK_TEXT): string {
  const parsed = parseColor(color);
  if (!parsed) return fallback;
  return luminance(parsed) > 0.45 ? DARK_TEXT : LIGHT_TEXT;
}

/**
 * The surface of a box that belongs to a role.
 *
 * @param color the colour of the role, in any form a stylesheet may write it
 * @param fallback what to use when the colour cannot be read
 */
export function surfaceFor(color: string, fallback: Surface): Surface {
  const parsed = parseColor(color);
  if (!parsed) {
    return fallback;
  }

  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };

  // a very pale wash carries the role without competing with the label
  const fill = mix(parsed, white, 0.86);
  // the border needs to hold its own against the wash, so it keeps most of the colour
  const border = luminance(parsed) > 0.7 ? mix(parsed, black, 0.25) : mix(parsed, white, 0.25);

  return {
    fill: toHex(fill),
    border: toHex(border),
    accent: toHex(parsed),
    text: DARK_TEXT
  };
}
