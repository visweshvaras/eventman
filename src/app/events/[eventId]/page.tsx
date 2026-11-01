import { Suspense } from "react";
import { EventDetails } from "@/components/event-details";

export default function EventDetailsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  return (
    <Suspense fallback={<main className="event-loading">Opening your event plan...</main>}>
      <EventDetailsRoute params={params} />
    </Suspense>
  );
}

async function EventDetailsRoute({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return <EventDetails eventId={eventId} />;
}
