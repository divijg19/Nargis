import { useCallback, useRef, useState } from "react";

type OnData = (data: Blob) => void;
type OnStop = () => void;

export function useMediaRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const onStopRef = useRef<(() => void) | undefined>(undefined);

  const start = useCallback(
    async (onData: OnData, onStop?: OnStop) => {
      if (isRecording) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      onStopRef.current = onStop;
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) onData(e.data);
      };
      recorder.onstart = () => setIsRecording(true);
      // Ensure we call the provided onStop callback AND perform cleanup (stop tracks)
      recorder.onstop = () => {
        setIsRecording(false);
        try {
          if (onStopRef.current) onStopRef.current();
        } catch (_err) {
          // swallow
        }
        const tracks = streamRef.current?.getTracks() || [];
        for (const t of tracks) t.stop();
        mediaRecorderRef.current = null;
        streamRef.current = null;
        onStopRef.current = undefined;
      };
      // Record until stopped. This yields a single Blob on stop, which keeps
      // the backend request model simple and avoids per-chunk orchestration.
      recorder.start();
    },
    [isRecording],
  );

  const stop = useCallback(() => {
    const r = mediaRecorderRef.current;
    if (!r) return;
    // Trigger the recorder to stop; the onstop handler set in start() will
    // perform cleanup and call the provided onStop callback.
    r.stop();
  }, []);

  return { start, stop, isRecording };
}
