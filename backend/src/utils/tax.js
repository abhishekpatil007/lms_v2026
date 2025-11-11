// src/utils/tax.js
/**
 * calculateGST
 * @param {number|string} amount - User supplied amount (could be inclusive or exclusive depending on isInclusive)
 * @param {number|string} gstRate - GST percent (e.g., 18)
 * @param {boolean} isInclusive - true => amount already includes GST
 * @returns {object} { base: Number, gst: Number, total: Number }
 *
 * All returned values are rounded to 2 decimal places.
 *
 * Note: amount is interpreted as:
 * - isInclusive = true  -> amount is total (includes GST)
 * - isInclusive = false -> amount is base (GST added on top)
 */
export function calculateGST(amount, gstRate = 18.0, isInclusive = true) {
    // normalization
    const amt = Number(amount);
    const rate = Number(gstRate);

    if (Number.isNaN(amt) || Number.isNaN(rate)) {
        throw new Error('Invalid amount or gstRate');
    }

    const round2 = (v) => {
        // ensure digit-by-digit correctness: multiply -> round -> divide
        return Math.round((v + Number.EPSILON) * 100) / 100;
    };

    if (isInclusive) {
        // base = total / (1 + r/100)
        const base = amt / (1 + rate / 100);
        const gst = amt - base;
        const baseR = round2(base);
        const gstR = round2(gst);
        const totalR = round2(amt); // original amount stays as total (rounded)
        // adjust for rounding drift: ensure base + gst == total (at 2 decimal places)
        const drift = totalR - round2(baseR + gstR);
        // apply drift to gstR (common practice)
        const gstFinal = round2(gstR + drift);

        return { base: baseR, gst: gstFinal, total: totalR };
    } else {
        // gst = base * (r/100), total = base + gst
        const gst = amt * (rate / 100);
        const gstR = round2(gst);
        const baseR = round2(amt);
        const totalR = round2(baseR + gstR);

        // adjust drift
        const drift = totalR - round2(baseR + gstR);
        const gstFinal = round2(gstR + drift);

        return { base: baseR, gst: gstFinal, total: totalR };
    }
}
