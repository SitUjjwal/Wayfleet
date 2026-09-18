import { VehiclePhoto } from "@/components/home/vehicle-photo";

export const HOME_VEHICLE_TYPES = [
  {
    title: "Auto rickshaw",
    blurb: "City three-wheeler",
    href: "/vehicles?category=auto_rickshaw",
    image: "/vehicles/auto.jpg",
  },
  {
    title: "Bike / Scooter",
    blurb: "Quick local hops",
    href: "/vehicles?category=two_wheeler",
    image: "/vehicles/bike.jpg",
  },
  {
    title: "Car",
    blurb: "Hatchback and sedan",
    href: "/vehicles?category=car",
    image: "/vehicles/car.jpg",
  },
  {
    title: "SUV",
    blurb: "Family and highway",
    href: "/vehicles?category=suv",
    image: "/vehicles/suv.jpg",
  },
  {
    title: "E-rickshaw",
    blurb: "Short neighbourhood rides",
    href: "/vehicles?category=e_rickshaw",
    image: "/vehicles/erickshaw.jpg",
  },
  {
    title: "Tempo traveller",
    blurb: "Group and outstation",
    href: "/vehicles?category=van",
    image: "/vehicles/van.jpg",
  },
  {
    title: "Mini truck",
    blurb: "Goods and cargo",
    href: "/vehicles?category=truck",
    image: "/vehicles/truck.jpg",
  },
  {
    title: "Bus",
    blurb: "Route and staff trips",
    href: "/vehicles?category=bus",
    image: "/vehicles/bus.jpg",
  },
  {
    title: "Train",
    blurb: "City-to-city travel",
    href: "/vehicles?category=train",
    image: "/vehicles/train.jpg",
  },
  {
    title: "Flight",
    blurb: "When you need to fly",
    href: "/vehicles?category=airplane",
    image: "/vehicles/airplane.jpg",
  },
] as const;

export const HERO_VEHICLE_PHOTOS = HOME_VEHICLE_TYPES.filter((item) =>
  [
    "/vehicles?category=auto_rickshaw",
    "/vehicles?category=two_wheeler",
    "/vehicles?category=car",
    "/vehicles?category=train",
  ].includes(item.href),
);

export function VehicleTypeGallery() {
  return (
    <section id="vehicles" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-copper">
            India fleet
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy sm:text-3xl">
            Every vehicle people book in India
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Auto, bike, car, SUV, e-rickshaw, tempo, mini truck, bus, train, and
            flight — tap a photo to browse listings.
          </p>
        </div>
        <a
          href="/vehicles"
          className="text-sm font-medium text-copper hover:text-copper-deep"
        >
          See all vehicles
        </a>
      </div>
      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        {HOME_VEHICLE_TYPES.map((item) => (
          <li key={item.title} className="h-full">
            <a
              href={item.href}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-paper-strong shadow-sm transition hover:shadow-md"
            >
              <VehiclePhoto
                src={item.image}
                alt={`${item.title} for booking`}
                className="aspect-[4/3] h-auto w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              />
              <div className="flex flex-1 flex-col p-3 sm:p-4">
                <p className="font-semibold text-navy">{item.title}</p>
                <p className="mt-1 text-sm text-muted">{item.blurb}</p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
