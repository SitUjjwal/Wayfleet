import {
  HERO_VEHICLE_PHOTOS,
  VehicleTypeGallery,
} from "@/components/home/vehicle-type-gallery";
import { VehiclePhoto } from "@/components/home/vehicle-photo";

const steps = [
  {
    title: "Choose a vehicle type",
    body: "Auto, bike, car, SUV, e-rickshaw, tempo, bus, train, or flight — tap a photo and browse listings.",
  },
  {
    title: "Book and pay",
    body: "Send a request with pickup and destination. Pay after the vendor confirms.",
  },
  {
    title: "Ride with live tracking",
    body: "Vendors share GPS on confirmed trips so you can follow the vehicle on the map.",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_85%_-20%,rgb(13_148_136/0.18),transparent_55%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-copper">
              India multi-vehicle booking
            </p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl sm:leading-tight">
              Book an auto, bike, car, train, or flight in one place.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">
              Wayfleet is built for India — autos and e-rickshaws next to
              cars, tempos, buses, trains, and flights.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#vehicles"
                className="inline-flex items-center justify-center rounded-xl bg-navy px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-navy-deep"
              >
                Choose a vehicle
              </a>
              <a
                href="/register"
                className="inline-flex items-center justify-center rounded-xl border border-line bg-paper-strong px-5 py-2.5 text-sm font-medium text-navy shadow-sm hover:bg-paper"
              >
                List your fleet
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {HERO_VEHICLE_PHOTOS.map((photo, index) => (
              <VehiclePhoto
                key={photo.title}
                src={photo.image}
                alt={photo.title}
                loading="eager"
                className={`h-36 w-full rounded-2xl object-cover shadow-sm sm:h-44 ${
                  index % 2 === 1 ? "mt-6" : ""
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      <VehicleTypeGallery />

      <section id="how-it-works" className="border-y border-line bg-paper-strong/70">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-navy">
            How it works
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Same booking flow for every vehicle type.
          </p>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-line bg-paper-strong p-6 shadow-sm"
              >
                <p className="font-mono text-xs font-medium text-copper">
                  0{index + 1}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-navy">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
