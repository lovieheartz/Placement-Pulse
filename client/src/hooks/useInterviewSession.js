import { useCallback, useEffect, useRef, useState } from 'react';
import { WS_BASE } from '../config/api';

/**
 * Realtime plumbing for the AI mock interview.
 *
 * Up:   mic → AudioWorklet → 16kHz PCM16 → WebSocket (continuously; the server
 *       runs voice-activity detection, so there is no push-to-talk).
 * Down: 24kHz PCM16 chunks → scheduled back-to-back on a single AudioContext
 *       clock so the voice plays gaplessly, plus streaming transcripts.
 *
 * Speaking over Alex triggers an `interrupted` event; we drop every queued
 * chunk immediately so he stops mid-sentence like a real person would.
 */

// Mic input is resampled to 16kHz inside the worklet (Gemini requires exactly
// that). Playback is 24kHz PCM16 — an AudioBuffer may declare its own rate, so
// Web Audio resamples it correctly even if the device runs at 48kHz.
const OUTPUT_RATE = 24000;
const SCHEDULE_AHEAD = 0.12; // seconds of slack against network jitter

// Below this peak the mic is producing effectively nothing. Real speech sits
// far above it, so it only trips on a genuinely dead input.
const SILENCE_PEAK = 0.02;
const SILENCE_GRACE_MS = 8000;

export default function useInterviewSession() {
  const [status, setStatus] = useState('idle'); // idle | connecting | listening | thinking | speaking | reconnecting | ended
  const [isMuted, setIsMuted] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micDead, setMicDead] = useState(false); // mic open but no sound reaching us
  const [heardYou, setHeardYou] = useState(false); // the AI has transcribed us at least once
  const [transcript, setTranscript] = useState([]); // committed turns
  const [liveUser, setLiveUser] = useState('');     // in-flight candidate speech
  const [liveAi, setLiveAi] = useState('');         // in-flight Alex speech
  const [questionNumber, setQuestionNumber] = useState(0);
  const [error, setError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);

  const wsRef = useRef(null);
  const micCtxRef = useRef(null);
  const micStreamRef = useRef(null);
  const workletRef = useRef(null);
  const playCtxRef = useRef(null);
  const nextPlayAtRef = useRef(0);
  const sourcesRef = useRef(new Set());
  const speakingTimerRef = useRef(null);
  const mutedRef = useRef(false);
  const closingRef = useRef(false);
  const lastSoundAtRef = useRef(0);

  /* ---------------------------------------------------------------- */
  /* Playback                                                          */
  /* ---------------------------------------------------------------- */

  const stopPlayback = useCallback(() => {
    for (const src of sourcesRef.current) {
      try { src.onended = null; src.stop(); } catch { /* already stopped */ }
    }
    sourcesRef.current.clear();
    nextPlayAtRef.current = 0;
    clearTimeout(speakingTimerRef.current);
  }, []);

  const enqueueAudio = useCallback((base64) => {
    const ctx = playCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    // base64 → PCM16 → Float32
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const pcm = new Int16Array(bytes.buffer, 0, bytes.length >> 1);
    if (pcm.length === 0) return;

    const buffer = ctx.createBuffer(1, pcm.length, OUTPUT_RATE);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) channel[i] = pcm[i] / 0x8000;

    // Schedule against our own clock, not "now" — that is what removes the
    // clicks and gaps between chunks.
    const startAt = Math.max(ctx.currentTime + SCHEDULE_AHEAD, nextPlayAtRef.current);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(startAt);

    sourcesRef.current.add(source);
    source.onended = () => sourcesRef.current.delete(source);

    nextPlayAtRef.current = startAt + buffer.duration;

    setStatus('speaking');
    clearTimeout(speakingTimerRef.current);
    const msLeft = (nextPlayAtRef.current - ctx.currentTime) * 1000;
    speakingTimerRef.current = setTimeout(() => {
      setStatus((s) => (s === 'speaking' ? 'listening' : s));
    }, msLeft + 120);
  }, []);

  /** Resolves once every queued chunk has actually been heard. */
  const waitForPlaybackDrain = useCallback((maxWaitMs = 20000) => {
    return new Promise((resolve) => {
      const started = Date.now();
      const tick = () => {
        const ctx = playCtxRef.current;
        const drained = !ctx || nextPlayAtRef.current <= ctx.currentTime;
        if (drained || Date.now() - started > maxWaitMs) resolve();
        else setTimeout(tick, 200);
      };
      tick();
    });
  }, []);

  /* ---------------------------------------------------------------- */
  /* Inbound events                                                    */
  /* ---------------------------------------------------------------- */

  const handleEvent = useCallback((msg) => {
    switch (msg.type) {
      case 'session_ready':
        setStatus('listening');
        break;

      case 'audio_delta':
        enqueueAudio(msg.audio);
        break;

      case 'ai_transcript_delta':
        setLiveAi((t) => t + msg.text);
        break;

      case 'user_transcript_delta':
        setLiveUser((t) => t + msg.text);
        setHeardYou(true); // proof the audio pipeline works end to end
        setMicDead(false);
        // They're mid-answer; Alex is not thinking yet.
        setStatus((s) => (s === 'speaking' ? s : 'listening'));
        break;

      case 'user_transcript':
        setLiveUser('');
        setTranscript((t) => [...t, { role: 'user', content: msg.text, timestamp: msg.timestamp }]);
        setStatus((s) => (s === 'speaking' ? s : 'thinking'));
        break;

      case 'ai_transcript':
        setLiveAi('');
        setTranscript((t) => [...t, { role: 'assistant', content: msg.text, timestamp: msg.timestamp }]);
        if (msg.questionNumber) setQuestionNumber(msg.questionNumber);
        break;

      case 'turn_complete':
        if (msg.questionNumber) setQuestionNumber(msg.questionNumber);
        break;

      case 'interrupted':
        // Candidate barged in — kill Alex's remaining audio instantly.
        stopPlayback();
        setLiveAi('');
        setStatus('listening');
        break;

      case 'interview_complete':
        setIsComplete(true);
        break;

      case 'reconnecting':
        setStatus('reconnecting');
        break;

      case 'reconnected':
        setStatus('listening');
        break;

      case 'fatal':
        setError(msg.error);
        break;

      case 'error':
        console.error('Interview error:', msg.error);
        break;

      default:
        break;
    }
  }, [enqueueAudio, stopPlayback]);

  /* ---------------------------------------------------------------- */
  /* Setup                                                             */
  /* ---------------------------------------------------------------- */

  const connect = useCallback((sessionId, token) => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${WS_BASE}/api/interview/ws`);
      wsRef.current = ws;

      const settle = setTimeout(() => reject(new Error('Timed out connecting to the interviewer')), 15000);

      ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token }));

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === 'auth_success') {
          ws.send(JSON.stringify({ type: 'init', sessionId }));
          return;
        }
        if (msg.type === 'auth_failed') {
          clearTimeout(settle);
          reject(new Error(msg.requiresLogin ? 'Your session expired. Please log in again.' : 'Authentication failed'));
          return;
        }
        if (msg.type === 'initialized') {
          clearTimeout(settle);
          resolve(msg.sessionInfo);
          return;
        }

        handleEvent(msg);
      };

      ws.onerror = () => {
        clearTimeout(settle);
        reject(new Error('Could not reach the interview server'));
      };

      ws.onclose = () => {
        if (!closingRef.current) setStatus((s) => (s === 'ended' ? s : 'reconnecting'));
      };
    });
  }, [handleEvent]);

  const startMic = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,   // stops Alex's voice from looping back in
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });
    micStreamRef.current = stream;

    // Run at the hardware's native rate. Forcing 16kHz here is what broke
    // capture: Chrome quietly ignores the hint on many devices, so we shipped
    // 48kHz audio labelled as 16kHz and Gemini heard garbled slow-motion noise.
    // The worklet resamples to exactly 16kHz instead, which is correct on any
    // device — and staying at the native rate keeps echo cancellation working.
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    micCtxRef.current = ctx;
    await ctx.audioWorklet.addModule('/interview-audio-worklet.js');

    const source = ctx.createMediaStreamSource(stream);
    const worklet = new AudioWorkletNode(ctx, 'interview-capture');
    workletRef.current = worklet;

    lastSoundAtRef.current = Date.now();

    worklet.port.onmessage = ({ data }) => {
      if (data.type === 'ready') {
        console.log(`🎤 Mic: capturing at ${data.inputRate}Hz → resampling to ${data.targetRate}Hz for Gemini`);
        return;
      }
      if (data.type !== 'chunk') return;

      setMicLevel(data.level);

      // A mic that is open but silent (wrong input device, muted in the OS,
      // hardware switch off) looks identical to "the AI is ignoring me" from
      // the candidate's side. Call it out instead of letting them talk to a wall.
      if (data.level > SILENCE_PEAK) {
        lastSoundAtRef.current = Date.now();
        setMicDead(false);
      } else if (!mutedRef.current && Date.now() - lastSoundAtRef.current > SILENCE_GRACE_MS) {
        setMicDead(true);
      }

      if (!data.pcm) return; // muted
      const ws = wsRef.current;
      if (ws?.readyState !== WebSocket.OPEN) return;

      const bytes = new Uint8Array(data.pcm);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      ws.send(JSON.stringify({ type: 'audio', audio: btoa(bin) }));
    };

    // A muted gain node keeps the worklet in the render graph (an unconnected
    // node isn't guaranteed to be pulled) without routing the mic to speakers.
    const silence = ctx.createGain();
    silence.gain.value = 0;
    source.connect(worklet);
    worklet.connect(silence);
    silence.connect(ctx.destination);
  }, []);

  const start = useCallback(async (sessionId, token) => {
    setStatus('connecting');
    setError(null);
    closingRef.current = false;

    // Created inside the click handler, so autoplay policy lets it make sound.
    playCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: OUTPUT_RATE });
    await playCtxRef.current.resume();

    const info = await connect(sessionId, token);
    await startMic();

    return info;
  }, [connect, startMic]);

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setIsMuted(next);
    workletRef.current?.port.postMessage({ type: 'mute', value: next });

    // Muting is silence on purpose — don't nag about it, and give the mic a
    // fresh grace period when they unmute.
    setMicDead(false);
    lastSoundAtRef.current = Date.now();
  }, []);

  const stop = useCallback(() => {
    closingRef.current = true;
    stopPlayback();

    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;

    try { workletRef.current?.disconnect(); } catch { /* noop */ }
    workletRef.current = null;

    micCtxRef.current?.close().catch(() => {});
    micCtxRef.current = null;

    playCtxRef.current?.close().catch(() => {});
    playCtxRef.current = null;

    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.close();
    wsRef.current = null;

    setStatus('ended');
    setMicLevel(0);
  }, [stopPlayback]);

  useEffect(() => stop, [stop]);

  return {
    status,
    isMuted,
    micLevel,
    micDead,
    heardYou,
    transcript,
    liveUser,
    liveAi,
    questionNumber,
    error,
    isComplete,
    start,
    stop,
    toggleMute,
    waitForPlaybackDrain,
  };
}
