/* eslint-disable @next/next/no-img-element */
export const HOME_VEHICLE_TYPES = [
  {
    title: "Car",
    blurb: "Sedan and hatchback",
    href: "/vehicles?category=car",
    image:
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Motorcycle",
    blurb: "Bikes for city hops",
    href: "/vehicles?category=two_wheeler",
    image:
      "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Auto",
    blurb: "Quick three-wheeler",
    href: "/vehicles?category=auto_rickshaw",
    image:
      "https://images.pexels.com/photos/2169052/pexels-photo-2169052.jpeg?auto=compress&cs=tinysrgb&w=900",
  },
  {
    title: "E-rickshaw",
    blurb: "Quiet local rides",
    href: "/vehicles?category=e_rickshaw",
    image:
      "https://images.pexels.com/photos/1118448/pexels-photo-1118448.jpeg?auto=compress&cs=tinysrgb&w=900",
  },
  {
    title: "Bus",
    blurb: "Group and route trips",
    href: "/vehicles?category=bus",
    image:
      "https://images.unsplash.com/photo-1544620341-11cb2cd7c626?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Train",
    blurb: "Longer city-to-city",
    href: "/vehicles?category=train",
    image:
      "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Airplane",
    blurb: "When you need to fly",
    href: "/vehicles?category=airplane",
    image:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "SUV",
    blurb: "Family and highway",
    href: "/vehicles?category=suv",
    image:
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=900&q=80",
  },
] as const;

export function VehicleTypeGallery() {
  return (
    <section id="vehicles" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-copper">
            Multi-vehicle booking
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy sm:text-3xl">
            Cars, bikes, autos, trains, and more
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Pick a type and see listings from vendors. Motorcycle, auto,
            e-rickshaw, bus, train, and airplane sit next to cars and SUVs.
          </p>
        </div>
        <a
          href="/vehicles"
          className="text-sm font-medium text-copper hover:text-copper-deep"
        >
          See all vehicles
        </a>
      </div>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {HOME_VEHICLE_TYPES.map((item) => (
          <li key={item.title}>
            <a
              href={item.href}
              className="group block overflow-hidden rounded-2xl border border-line bg-paper-strong shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <img
                src={item.image}
                alt={`${item.title} for booking`}
                className="h-40 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                loading="lazy"
              />
              <div className="p-4">
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
