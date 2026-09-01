import { luminance, mix, parseColor, readableTextOn, surfaceFor, toHex } from './color';

const fallback = { fill: '#eef4fd', border: '#9db8e0', accent: '#4c7fd4', text: '#374151' };

describe('parseColor', () => {

  it('reads the forms a stylesheet writes', () => {
    expect(parseColor('#0d6efd')).toEqual({ r: 13, g: 110, b: 253 });
    expect(parseColor('#FFF')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('rgb(13, 110, 253)')).toEqual({ r: 13, g: 110, b: 253 });
    expect(parseColor('rgba(13, 110, 253, 0.5)')).toEqual({ r: 13, g: 110, b: 253 });
  });

  it('says so when it cannot read a colour, instead of guessing', () => {
    // a canvas handed one of these keeps painting in the previous colour
    expect(parseColor('var(--role-customer)')).toBeNull();
    expect(parseColor('')).toBeNull();
    expect(parseColor(undefined as any)).toBeNull();
    expect(parseColor('rebeccapurple')).toBeNull();
  });
});

describe('luminance', () => {

  it('puts white at the top and black at the bottom', () => {
    expect(luminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 3);
    expect(luminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 3);
  });

  it('sees yellow as brighter than blue', () => {
    expect(luminance({ r: 224, g: 224, b: 80 })).toBeGreaterThan(luminance({ r: 13, g: 110, b: 253 }));
  });
});

describe('mix and toHex', () => {

  it('meets in the middle', () => {
    expect(toHex(mix({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, 0.5))).toBe('#808080');
  });

  it('keeps the colour at nothing and replaces it at everything', () => {
    const blue = { r: 13, g: 110, b: 253 };
    expect(toHex(mix(blue, { r: 255, g: 255, b: 255 }, 0))).toBe('#0d6efd');
    expect(toHex(mix(blue, { r: 255, g: 255, b: 255 }, 1))).toBe('#ffffff');
  });
});

describe('readableTextOn', () => {

  it('writes dark on a light background and light on a dark one', () => {
    expect(readableTextOn('#fdf6e3')).toBe('#374151');
    expect(readableTextOn('#1b3a5c')).toBe('#ffffff');
  });

  it('falls back where it cannot read the background', () => {
    expect(readableTextOn('var(--nothing)', '#123456')).toBe('#123456');
  });
});

describe('surfaceFor', () => {

  it('turns a role colour into a wash, not a wall of colour', () => {
    const surface = surfaceFor('#0d6efd', fallback);
    const fill = parseColor(surface.fill)!;

    // the box is nearly white, so the label carries it
    expect(luminance(fill)).toBeGreaterThan(0.7);
    // and the role is still there, at full strength on the edge
    expect(surface.accent).toBe('#0d6efd');
  });

  it('keeps the label dark whatever colour a role is given', () => {
    ['#0d6efd', '#198754', '#ffc107', '#000000', '#ffffff'].forEach(color => {
      const surface = surfaceFor(color, fallback);
      const fill = parseColor(surface.fill)!;
      expect(surface.text).toBe('#374151');
      // dark text needs a light box under it, for every one of them
      expect(luminance(fill)).toBeGreaterThan(0.6);
    });
  });

  it('gives the border enough weight to be seen against the wash', () => {
    const surface = surfaceFor('#0d6efd', fallback);
    expect(luminance(parseColor(surface.border)!)).toBeLessThan(luminance(parseColor(surface.fill)!));
  });

  it('darkens the border of a colour that is too pale to draw a line with', () => {
    const surface = surfaceFor('#fff8b0', fallback);
    expect(luminance(parseColor(surface.border)!)).toBeLessThan(luminance(parseColor('#fff8b0')!));
  });

  it('uses the default surface for a colour it cannot read', () => {
    expect(surfaceFor('var(--role-customer)', fallback)).toEqual(fallback);
  });
});
