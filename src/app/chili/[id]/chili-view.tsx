"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChiliDetail } from "@/components/ChiliDetail";
import { EventBand } from "@/components/EventBand";
import { fetchChili } from "@/lib/chilis";
import { useLive } from "@/lib/live";
import { useEventPhase } from "@/lib/phase";
import { useRevealRedirect } from "@/lib/use-reveal-redirect";
import { fetchAllergens, fetchTags } from "@/lib/reference";
import { fetchTagCounts } from "@/lib/tags";

export function ChiliView() {
  const { id } = useParams<{ id: string }>();
  const { data: chili } = useLive(["chilis"], () => fetchChili(id));
  const { data: allergens } = useLive([], fetchAllergens, 86_400_000);
  const { data: tags } = useLive([], fetchTags, 86_400_000);
  const { data: tagCounts, refresh } = useLive(["chili_tags"], fetchTagCounts);
  const { event, phase, votingOpen: tagsEnabled } = useEventPhase();
  useRevealRedirect(phase);
  return (
    <>
      <EventBand size="compact">{event?.name}</EventBand>
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-2 pb-6">
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
    </>
  );
}
