"use client";

import dynamic from "next/dynamic";
import { PageCanvas } from "@/components/layout/PageCanvas";

const ChatPanel = dynamic(() => import("@/components/ui/ChatPanel"), {
  ssr: false,
});

export default function Home() {
  const permissionDenied = false;

  return (
    <PageCanvas className="justify-center pb-6 pt-6">
      <section className="flex min-h-full items-center justify-center">
        <div className="w-full max-w-[76rem]">
          <ChatPanel compact merged permissionDenied={permissionDenied} />
        </div>
      </section>
    </PageCanvas>
  );
}
