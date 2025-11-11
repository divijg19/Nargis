"use client";

import dynamic from "next/dynamic";

// Perform the dynamic import from a client component. Next.js disallows
// using `ssr: false` from Server Components (like app/layout). Moving the
// dynamic import into a client wrapper fixes the Turbopack/Next error.
const AIResponseModal = dynamic(() => import("./AIResponseModal"), {
	ssr: false,
});

export default function AIResponseModalLoader() {
	return <AIResponseModal />;
}
