"use client";

type VehiclePhotoProps = {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
};

export function VehiclePhoto({
  src,
  alt,
  className,
  loading = "lazy",
}: VehiclePhotoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onError={(event) => {
        event.currentTarget.src = "/vehicles/fallback.svg";
      }}
    />
  );
}
