// /apps/web/src/app/page.tsx
"use client"; // Required for useEffect

import { useEffect, useState } from "react";

export default function Home() {
  const [apiStatus, setApiStatus] = useState("checking...");

  useEffect(() => {
    // Fetch from the Python API health endpoint
    fetch(`${process.env.NEXT_PUBLIC_API_PY_URL}/health`)
      .then((res) => res.json())
      .then((data) => {
        console.log("API Response:", data);
        setApiStatus(data.status || "error");
      })
      .catch((err) => {
        console.error("API Fetch Error:", err);
        setApiStatus("unreachable");
      });
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Nargis</h1>
      <p className="mt-4 text-lg">
        Python API Status:{" "}
        <span className="font-mono bg-gray-200 p-1 rounded">{apiStatus}</span>
      </p>
    </main>
  );
}
