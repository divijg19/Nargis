'use client';

import { useEffect, useState, useRef } from 'react';

export default function Home() {
  const [apiStatus, setApiStatus] = useState('checking...');
  const [isRecording, setIsRecording] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [statusText, setStatusText] = useState('Disconnected');

  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_API_PY_URL + '/health')
      .then(res => res.json())
      .then(data => setApiStatus(data.status || 'error'))
      .catch(() => setApiStatus('unreachable'));
  }, []);

  const handleToggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        // The onstop handler will send the EOS message.
      }
      setIsRecording(false);
    } else {
      setAiResponse('');
      setStatusText('Connecting...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const socket = new WebSocket('ws://localhost:8080/ws');
        socketRef.current = socket;

        socket.onopen = () => {
          console.log("WebSocket connection established.");
          setStatusText('Connected & Listening...');

          const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
          mediaRecorderRef.current = mediaRecorder;

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
              socket.send(event.data);
            }
          };

          // --- THIS IS THE CRITICAL FIX #3 ---
          // When the recorder stops, send an "End Of Stream" message.
          mediaRecorder.onstop = () => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send('EOS');
            }
            setStatusText('Processing...');
          };

          socket.onmessage = (event) => {
            console.log("Response from server:", event.data);
            try {
              const response = JSON.parse(event.data);
              if (response.text) { setAiResponse(response.text); }
              else if (response.error) { setAiResponse(`Error: ${response.error}`); }
            } catch (error) {
              setAiResponse(event.data);
            }
          };

          mediaRecorder.start(500);
          setIsRecording(true);
        };

        socket.onclose = () => {
          console.log("WebSocket connection closed.");
          setStatusText('Disconnected');
        };

        socket.onerror = (error) => {
          console.error("WebSocket error:", error);
          setStatusText('Connection Error');
        };

      } catch (error) {
        console.error("Error accessing microphone:", error);
        alert("Could not access microphone. Please check permissions.");
        setStatusText('Mic Error');
      }
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <h1 className="text-5xl font-bold text-gray-800">Nargis</h1>
      <p className="mt-4 text-lg text-gray-600">
        Python API Status: <span className="font-mono bg-gray-200 p-1 rounded">{apiStatus}</span>
      </p>

      <div className="mt-12 flex flex-col items-center">
        <button
          onClick={handleToggleRecording}
          disabled={statusText === 'Processing...'}
          className={`px-8 py-4 text-xl font-semibold rounded-full shadow-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${isRecording
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-indigo-600 text-white'
            }`}
        >
          {isRecording ? 'Stop Recording' : 'Ask Nargis'}
        </button>
        <p className="mt-4 text-center text-sm text-gray-500">
          Status: {statusText}
        </p>
      </div>

      {aiResponse && (
        <div className="mt-12 p-6 bg-white rounded-lg shadow-md w-full max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-700">Nargis says:</h2>
          <p className="mt-2 text-gray-600 whitespace-pre-wrap">{aiResponse}</p>
        </div>
      )}
    </main>
  );
}