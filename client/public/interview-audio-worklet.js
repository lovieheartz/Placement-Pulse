/**
 * Mic capture worklet for the AI mock interview.
 *
 * Gemini Live only accepts 16 kHz mono PCM16. We used to get that by asking for
 * an AudioContext at 16 kHz — but Chrome frequently ignores that hint and hands
 * back the hardware rate (usually 48 kHz). We then labelled 48 kHz audio as
 * `rate=16000`, so Gemini heard everything ~3x too slow and never recognised it
 * as speech. The level meter still bounced, which made it look like the AI was
 * simply ignoring the candidate.
 *
 * So: take whatever rate the context actually runs at (`sampleRate`, a global in
 * AudioWorkletGlobalScope) and resample to exactly 16 kHz here. Correct on every
 * device, whatever the hardware does.
 *
 * Runs on the audio thread — keep it allocation-light.
 */

const TARGET_RATE = 16000;
const CHUNK_SAMPLES = 2048; // 128ms @ 16kHz

class InterviewCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this._ratio = sampleRate / TARGET_RATE; // e.g. 48000/16000 = 3
    this._cursor = 0;   // fractional read position into the current input block
    this._last = 0;     // final sample of the previous block, for interpolation
    this._out = new Float32Array(CHUNK_SAMPLES);
    this._outLen = 0;
    this._muted = false;

    this.port.onmessage = (event) => {
      if (event.data?.type === 'mute') this._muted = !!event.data.value;
    };

    // Surfaced once so a rate mismatch is never invisible again.
    this.port.postMessage({ type: 'ready', inputRate: sampleRate, targetRate: TARGET_RATE });
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input || input.length === 0) return true;

    // Walk the 16kHz output grid across this block of input samples.
    let pos = this._cursor;
    while (pos < input.length) {
      const i = Math.floor(pos);
      const t = pos - i;
      const a = i === 0 ? this._last : input[i - 1];
      const b = input[i];

      this._out[this._outLen++] = a + (b - a) * t;

      if (this._outLen === CHUNK_SAMPLES) {
        this._flush();
        this._outLen = 0;
      }

      pos += this._ratio;
    }

    // Carry the leftover fraction and the last sample into the next block, so
    // the resampled stream is continuous across quantum boundaries.
    this._cursor = pos - input.length;
    this._last = input[input.length - 1];

    return true;
  }

  _flush() {
    let peak = 0;
    const pcm = new Int16Array(CHUNK_SAMPLES);

    for (let i = 0; i < CHUNK_SAMPLES; i++) {
      const s = Math.max(-1, Math.min(1, this._out[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      const abs = s < 0 ? -s : s;
      if (abs > peak) peak = abs;
    }

    // Always report the level, even while muted — the meter is how a candidate
    // confirms their mic works before they unmute. Only the audio is withheld.
    this.port.postMessage(
      { type: 'chunk', pcm: this._muted ? null : pcm.buffer, level: peak },
      this._muted ? [] : [pcm.buffer]
    );
  }
}

registerProcessor('interview-capture', InterviewCaptureProcessor);
