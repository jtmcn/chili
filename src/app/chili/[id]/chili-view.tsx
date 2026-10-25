"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChiliDetail } from "@/components/ChiliDetail";
import { fetchChili } from "@/lib/chilis";
import { useLive } from "@/lib/live";
import { currentPhase, fetchEvent } from "@/lib/event";
import { fetchAllergens, fetchTags } from "@/lib/reference";
import { fetchTagCounts } from "@/lib/tags";

export function ChiliView() {
  const { id } = useParams<{ id: string }>();
  const { data: chili } = useLive(["chilis"], () => fetchChili(id));
  const { data: allergens } = useLive([], fetchAllergens, 86_400_000);
  const { data: tags } = useLive([], fetchTags, 86_400_000);
  const { data: tagCounts, refresh } = useLive(["chili_tags"], fetchTagCounts);
  const { data: event } = useLive(["event"], fetchEvent);
  // Mirrors the server's voting_open(), which also requires reveal_at.
  const tagsEnabled =
    !!event?.revealAt &&
    currentPhase(event, Date.parse(event.serverNow)) === "voting";
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      {chili ? (
        <ChiliDetail
          chili={chili}
          allergens={allergens ?? []}
          tags={tags}
          tagCounts={tagCounts}
          tagsEnabled={tagsEnabled}
          onTagChanged={refresh}
        />
      ) : (
        chili === null && (
          <>
            <p className="text-[18px]">Chili not found.</p>
            <Link
              href="/"
              className="flex min-h-12 items-center text-enamel underline"
            >
              Back to all chilis
            </Link>
          </>
        )
      )}
    </main>
  );
}
