"use client";

import dynamic from "next/dynamic";

const ChatPanel = dynamic(() => import("@/components/ui/ChatPanel"), {
  ssr: false,
});

export default function Home() {
  const permissionDenied = false;

  return (
    <div className="relative h-full overflow-hidden">
      <section className="relative overflow-hidden h-full">
        <div className="relative z-10 max-w-300 mx-auto px-5 sm:px-7 lg:px-12 h-full flex items-center">
          <div className="w-full h-full py-8">
            <div className="h-full flex items-center justify-center">
              <div className="relative w-full max-w-220 h-full max-h-full overflow-hidden flex flex-col">
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                  <ChatPanel
                    compact
                    merged
                    permissionDenied={permissionDenied}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
