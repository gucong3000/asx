// A general color module, supporting css string colors, canvas2d pixel
// colors, webgl and canvas2d Uint8ClampedArray r,g,b,a arrays. Note: a
// JavaScript Array is **not** a color!

import util from './util.js'

const Color = {

// ### CSS Color Strings.

  // CSS colors in HTML are strings, see [Mozillas Color Reference](
  // https://developer.mozilla.org/en-US/docs/Web/CSS/color_value),
  // taking one of 7 forms:
  //
  // * Names: over 140 color case-insensitive names like
  //   Red, Green, CadetBlue, etc.
  // * Hex, short and long form: #0f0, #ff10a0
  // * RGB: rgb(255, 0, 0), rgba(255, 0, 0, 0.5)
  // * HSL: hsl(120, 100%, 50%), hsla(120, 100%, 50%, 0.8)
  //
  // See [this wikipedia article](https://goo.gl/ev8Kw0)
  // on differences between HSL and HSB/HSV.

  // Convert 4 r,g,b,a ints in [0-255] to a css color string.
  // Alpha "a" is int in [0-255], converted to float in 0-1 for rgba string.
  rgbaString (r, g, b, a = 255) {
    a = a / 255; const a4 = a.toPrecision(4)
    return (a === 1) ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a4})`
  },

  // Convert 3 ints, h in [0-360], s,l in [0-100]% to a css color string.
  // Alpha "a" is int in [0-255].
  //
  // Note h=0 and h=360 are the same, use h in 0-359 for unique colors.
  hslString (h, s, l, a = 255) {
    a = a / 255; const a4 = a.toPrecision(4)
    return (a === 1) ? `hsl(${h},${s}%,${l}%)` : `hsla(${h},${s}%,${l}%,${a4})`
  },

  // Return a html/css hex color string for an r,g,b opaque color (a=255)
  //
  // Both #nnn and #nnnnnn forms supported.
  // Default is to check for the short hex form: #nnn.
  hexString (r, g, b, shortOK = true) {
    if (shortOK) {
      const [r0, g0, b0] = [r / 17, g / 17, b / 17]
      if (util.isInteger(r0) && util.isInteger(g0) && util.isInteger(b0))
        return this.hexShortString(r0, g0, b0)
    }
    return `#${(0x1000000 | (b | g << 8 | r << 16)).toString(16).slice(-6)}`
  },
  // Return the 4 char short version of a hex color.  Each of the r,g,b values
  // must be in [0-15].  The resulting color will be equivalent
  // to `r*17`, `g*17`, `b*17`, resulting in the 16 values:
  //
  //     0, 17, 34, 51, 68, 85, 102, 119, 136, 153, 170, 187, 204, 221, 238, 255
  //
  // This is equivalent util.aIntRamp(0,255,16), i.e. 16 values per rgb channel.
  hexShortString (r, g, b) {
    if ((r > 15) || (g > 15) || (b > 15)) {
      util.error(`hexShortString: one of ${[r, g, b]} > 15`)
    }
    return `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`
  },

  // This is a hybrid string and generally our default.  It returns:
  //
  // * rgbaString if a not 255 (i.e. not opaque)
  // * hexString otherwise
  // * with the hexShortString if appropriate
  triString (r, g, b, a = 255) {
    return (a === 255) ? // eslint-disable-line
      this.hexString(r, g, b, true) : this.rgbaString(r, g, b, a)
  },

// ### CSS String Conversions

  // Return 4 element array given any legal CSS string color.
  //
  // Because strings vary widely: CadetBlue, #0f0, rgb(255,0,0),
  // hsl(120,100%,50%), we do not parse strings, instead we let
  // the browser do our work: we set a 1x1 canvas fillStyle
  // to the string and create a pixel, returning the r,g,b,a TypedArray.

  // The shared 1x1 canvas 2D context.
  sharedCtx1x1: util.createCtx(1, 1), // share across calls.
  // Convert any css string to TypedArray.
  // If you need a JavaScript Array, use util.convertArray(array, Array)
  stringToUint8s (string) {
    this.sharedCtx1x1.fillStyle = string
    this.sharedCtx1x1.fillRect(0, 0, 1, 1)
    return this.sharedCtx1x1.getImageData(0, 0, 1, 1).data
  },

  // ### Typed Color
  // A typedColor is a 4 element Uint8ClampedArray, with two properties:
  //
  // * pixelArray: A single element Uint32Array view on the Uint8ClampedArray
  // * string: an optional, lazy evaluated, css color string.
  //
  // This provides a universal color, good for pixels, webgl & image
  // TypedArrays, and css/canvas2d strings.

  // Create typedColor from r,g,b,a. Use toTypedColor below for strings etc.
  // If r is TypedArray, assumed to be length 4, use it for the typedColer.
  // Used for colormaps and above functions returning 4 byte Uint8s.
  typedColor (r, g, b, a = 255) {
    const u8array = r.buffer ? r : new Uint8ClampedArray([r, g, b, a])
    u8array.pixelArray = new Uint32Array(u8array.buffer) // one element array
    // Make this an instance of TypedColorProto
    util.setPrototypeOf(u8array, TypedColorProto)
    return u8array
  },
  // Create a typedColor from a css string, pixel, JavaScript or Typed Array.
  // Useful for hsl: toTypedColor(<hsl css string>) or any of the functions
  // returning uint8s: toTypedColor(<uint8s array>)
  toTypedColor (any) {
    if (util.isTypedArray(any) && any.length === 4)
      return this.typedColor(any)
    const tc = this.typedColor(0, 0, 0, 0)
    if (util.isInteger(any)) tc.setPixel(any)
    else if (Array.isArray(any) || util.isTypedArray(any)) tc.setColor(...any)
    else if (typeof any === 'string') tc.setString(any)
    else util.error('toTypedColor: invalid argument')
    return tc
  },
  // Return a random rgb typedColor, a=255
  randomTypedColor () {
    const r255 = () => util.randomInt(256) // random int in [0,255]
    return this.typedColor(r255(), r255(), r255())
  }

}

const TypedColorProto = {
  // Set TypedColorProto prototype to Uint8ClampedArray's prototype
  __proto__: Uint8ClampedArray.prototype,
  // Set the TypedArray
  setColor (r, g, b, a = 255) {
    this.checkColorChange()
    this[0] = r; this[1] = g; this[2] = b; this[3] = a
  },
  // No need for getColor, it *is* the typed Uint8 array

  // Set the pixel view, changing the shared array (Uint8) view too
  setPixel (pixel) {
    this.checkColorChange()
    this.pixelArray[0] = pixel
  },
  // Get the pixel value
  getPixel () { return this.pixelArray[0] },

  // Set pixel/rgba values to equivalent of the css string.
  // 'red', '#f00', 'ff0000', 'rgb(255,0,0)', etc equivalent
  //
  // Does *not* set the chached this.string, which will be lazily evaluated
  // to its common triString by getString(). The above would all return '#f00'.
  setString (string) {
    return this.setColor(...Color.stringToUint8s(string))
  },
  // Return the triString for this typedColor, cached in the @string value
  getString () {
    if (this.string == null) this.string = Color.triString(...this)
    return this.string
  },
  // Housekeeping when a color is modified.
  checkColorChange () {
    // Reset string on color change.
    this.string = null // will be lazy evaluated via getString.
  },
  // Return true if color is same value as myself, comparing pixels
  equals (color) { return this.getPixel() === color.getPixel() },
  // Return a [distance metric](
  // http://www.compuphase.com/cmetric.htm) between two colors.
  // Max distance is roughly 765 (3*255), for black & white.
  // For our purposes, omitting the sqrt will not effect our results
  rgbDistance (r, g, b) {
    const [r1, g1, b1] = this
    const rMean = Math.round((r1 + r) / 2)
    const [dr, dg, db] = [r1 - r, g1 - g, b1 - b]
    const [dr2, dg2, db2] = [dr * dr, dg * dg, db * db]
    const distanceSq =
      (((512 + rMean) * dr2) >> 8) + (4 * dg2) + (((767 - rMean) * db2) >> 8)
    return distanceSq // Math.sqrt(distanceSq)
  }

}

export default Color