import { LoadingState } from "@/components/feedback/loading-state";

export default function VehiclesLoading() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <LoadingState message="Loading vehicles…" />
    </section>
  );
}
