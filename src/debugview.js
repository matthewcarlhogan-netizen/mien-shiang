/*
 * Geometry debug view — pure HTML string generation.
 *
 * ── WHY THIS IS NOT IN ui.js ───────────────────────────────────────────────
 * `ui.js` wires the DOM at module scope, so it cannot be imported under
 * `node --test`. Keeping this rendering pure — report in, string out, no DOM —
 * means the view can be tested without a browser AND without a face photo.
 *
 * That matters because this view is the thing that satisfies "no black box":
 * every shape label must be traceable to the ratio that produced it. A view
 * that silently drops the trace would defeat the constraint while looking fine,
 * and the only way to catch that cheaply is to assert on the output string.
 *
 * ── WHAT THIS VIEW MAY CONTAIN ─────────────────────────────────────────────
 * Measurements and the arithmetic behind them. No trait copy, no reading, no
 * rating, no health vocabulary. Interpretation is a separate layer.
 */

/** Everything interpolated is an internal constant or a number, but this
 *  writes to innerHTML — so escape anyway rather than relying on that. */
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export const num = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "—");

const kv = (rows) =>
  `<table class="dbg"><tbody>${rows
    .map(([k, v]) => `<tr><td>${esc(k)}</td><td class="v">${v}</td></tr>`)
    .join("")}</tbody></table>`;

/**
 * @param {object|null} g          geometryReport() output
 * @param {object|null} expression expressionState() output, or null
 * @param {string|null} delegate   "GPU" | "CPU"
 * @returns {string} HTML, or "" when there is no geometry to show
 */
export function renderGeometry(g, expression, delegate) {
  if (!g) return "";

  const traceRow = (t) => `<tr>
      <td>${esc(t.label)}</td>
      <td class="v">${num(t.value, 3)}</td>
      <td class="v">${esc(t.op)} ${num(t.threshold, 3)}</td>
      <td class="v">${t.passed ? "&#10003;" : "&#10007;"}</td>
    </tr>`;

  const trace = g.shape.because.length
    ? `<table class="dbg">
         <thead><tr><th>ratio</th><th>measured</th><th>needed</th><th></th></tr></thead>
         <tbody>${g.shape.because.map(traceRow).join("")}</tbody>
       </table>`
    : `<p class="muted" style="font-size:.8rem">No rule matched, so this fell
       through to <b>${esc(g.shape.shape)}</b> — the residual class. That means
       nothing else fired, not that the face was measured as
       ${esc(g.shape.shape)}.</p>`;

  const alts = g.shape.alternatives?.length
    ? `<p class="muted" style="font-size:.8rem">Near misses:
       ${g.shape.alternatives.map((a) =>
        `<b>${esc(a.shape)}</b> (missed on ${a.missedBy
          .map((t) => `${esc(t.label)} = ${num(t.value, 3)}`).join("; ")})`).join(" &middot; ")}</p>`
    : "";

  const m = g.metrics, t = g.thirds, f = g.fifths;

  const expressionBlock = expression ? `
      <p class="eyebrow">Expression at the moment of capture</p>
      ${kv([
        ["rest face", num(expression.neutral, 2)],
        ["smiling", num(expression.smile, 2)],
        ["eyes closed", num(expression.eyesClosed, 2)],
        ["left/right difference", num(expression.asymmetryIndex, 3)],
      ])}
      <p class="muted" style="font-size:.78rem">This describes how you were holding
        your face in this one photo &mdash; nothing more. Expression changes minute
        to minute and says nothing about who you are.</p>
      ${expression.flags?.eyesClosed ? `<p class="halted" style="margin:.6rem 0">Your
        eyes look closed here &mdash; worth retaking.</p>` : ""}
      ${expression.flags?.strongExpression ? `<p class="halted" style="margin:.6rem 0">This
        was taken mid-expression, which moves the proportions above. A rest face
        gives steadier numbers.</p>` : ""}` : "";

  return `
    <details class="dbg-wrap">
      <summary>Show the measurements behind this</summary>

      <p class="eyebrow">Capture</p>
      ${kv([
        ["compute path", esc(delegate ?? "—")],
        ["head tilt corrected", `${num(g.rollDegrees, 1)}&deg;`],
        ["left/right offset difference", num(g.pose.asymmetry, 3)],
        ["square enough to the camera", g.pose.frontal ? "yes" : "no"],
      ])}
      ${g.shapeReliable ? "" : `<p class="halted" style="margin:.6rem 0">The head is
        turned far enough that the widths below are foreshortened. The shape is
        shown so you can see the working, but it shouldn't be relied on &mdash;
        retake square to the camera.</p>`}

      <p class="eyebrow">Proportions</p>
      ${kv([
        ["face length", `${num(m.faceLength, 1)} px`],
        ["cheekbone width", `${num(m.bizygomaticWidth, 1)} px`],
        ["jaw width", `${num(m.bigonialWidth, 1)} px`],
        ["forehead width", `${num(m.frontotemporalWidth, 1)} px`],
      ])}

      <p class="eyebrow">Shape &mdash; ${esc(g.shape.shape)}</p>
      <p style="font-size:.85rem;margin:.3rem 0 .6rem">${esc(g.shape.reads)}</p>
      ${trace}
      ${alts}

      <p class="eyebrow">Three Courts (&#19977;&#20572;)</p>
      ${kv([
        ["upper", `${num(t.upperFraction * 100, 1)}%`],
        ["middle", `${num(t.middleFraction * 100, 1)}%`],
        ["lower", `${num(t.lowerFraction * 100, 1)}%`],
      ])}
      <p class="muted" style="font-size:.78rem">${esc(t.caveat)}</p>

      <p class="eyebrow">Facial fifths</p>
      ${kv(f.fractions.map((x, i) => [`fifth ${i + 1}`, `${num(x * 100, 1)}%`]))}

      <p class="eyebrow">Width-to-height proportion</p>
      ${kv([["value", num(g.fwhr.value, 3)]])}
      <p class="muted" style="font-size:.78rem">Measured as ${esc(g.fwhr.definition)}.
        Shown as a plain proportion of the face. It is not a measure of character,
        and published links between this ratio and behaviour are small and disputed.</p>

      ${expressionBlock}
    </details>`;
}
