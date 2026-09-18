/**
 * TEST FIXTURES ONLY
 *
 * Isolated mock catalog for unit tests. Production marketplace pages read MongoDB
 * through the vehicle APIs and must not import this module.
 * Amounts are integer minor units (paise for INR).
 */

import type {
  VehicleAvailability,
  VehicleCategory,
  VehicleStatus,
} from "@/types/domain";

export const DEMO_DATA_NOTICE =
  "Demo catalog for UI only. This is not live MongoDB inventory.";

export type DemoVehicle = {
  id: string;
  isDemoData: true;
  category: VehicleCategory;
  brand: string;
  model: string;
  registrationNumber: string;
  vendorName: string;
  vendorVerified: boolean;
  images: string[];
  pricing: {
    amount: number;
    currency: "INR";
    unit: "day";
  };
  rating: {
    average: number;
    count: number;
  };
  location: {
    label: string;
    city: string;
  };
  availability: VehicleAvailability;
  status: VehicleStatus;
  description: string;
  specs: {
    seats: number;
    fuel: string;
    transmission: string;
  };
};

export const DEMO_VEHICLES: DemoVehicle[] = [
  {
    id: "demo-innova-pune",
    isDemoData: true,
    category: "suv",
    brand: "Toyota",
    model: "Innova Crysta",
    registrationNumber: "MH12AB4421",
    vendorName: "Harbor Fleet",
    vendorVerified: true,
    images: [],
    pricing: { amount: 450000, currency: "INR", unit: "day" },
    rating: { average: 4.8, count: 126 },
    location: { label: "Pune Airport", city: "Pune" },
    availability: "available",
    status: "active",
    description:
      "Seven-seat MPV suited to airport transfers and family trips around Pune.",
    specs: { seats: 7, fuel: "Diesel", transmission: "Automatic" },
  },
  {
    id: "demo-dzire-pune",
    isDemoData: true,
    category: "car",
    brand: "Maruti Suzuki",
    model: "Dzire",
    registrationNumber: "MH12CD1109",
    vendorName: "Harbor Fleet",
    vendorVerified: true,
    images: [],
    pricing: { amount: 180000, currency: "INR", unit: "day" },
    rating: { average: 4.5, count: 88 },
    location: { label: "Shivajinagar", city: "Pune" },
    availability: "available",
    status: "active",
    description: "Compact sedan for city errands and daily commutes.",
    specs: { seats: 5, fuel: "Petrol", transmission: "Manual" },
  },
  {
    id: "demo-tempo-mumbai",
    isDemoData: true,
    category: "van",
    brand: "Force",
    model: "Traveller",
    registrationNumber: "MH01EF7788",
    vendorName: "Coastal Moves",
    vendorVerified: true,
    images: [],
    pricing: { amount: 620000, currency: "INR", unit: "day" },
    rating: { average: 4.2, count: 41 },
    location: { label: "Andheri East", city: "Mumbai" },
    availability: "available",
    status: "active",
    description: "Staff and group transport with luggage space for city hops.",
    specs: { seats: 12, fuel: "Diesel", transmission: "Manual" },
  },
  {
    id: "demo-ace-mumbai",
    isDemoData: true,
    category: "truck",
    brand: "Tata",
    model: "Ace Gold",
    registrationNumber: "MH02GH3344",
    vendorName: "Coastal Moves",
    vendorVerified: false,
    images: [],
    pricing: { amount: 210000, currency: "INR", unit: "day" },
    rating: { average: 4.0, count: 19 },
    location: { label: "Bhiwandi", city: "Mumbai" },
    availability: "unavailable",
    status: "active",
    description: "Last-mile cargo mover. Shown as unavailable in this demo.",
    specs: { seats: 2, fuel: "Diesel", transmission: "Manual" },
  },
  {
    id: "demo-scorpio-blr",
    isDemoData: true,
    category: "suv",
    brand: "Mahindra",
    model: "Scorpio N",
    registrationNumber: "KA03JK5566",
    vendorName: "Garden City Rides",
    vendorVerified: true,
    images: [],
    pricing: { amount: 390000, currency: "INR", unit: "day" },
    rating: { average: 4.6, count: 73 },
    location: { label: "Whitefield", city: "Bengaluru" },
    availability: "available",
    status: "active",
    description: "High-clearance SUV for highway and weekend routes.",
    specs: { seats: 7, fuel: "Diesel", transmission: "Automatic" },
  },
  {
    id: "demo-activa-blr",
    isDemoData: true,
    category: "two_wheeler",
    brand: "Honda",
    model: "Activa 6G",
    registrationNumber: "KA05LM2211",
    vendorName: "Garden City Rides",
    vendorVerified: true,
    images: [],
    pricing: { amount: 45000, currency: "INR", unit: "day" },
    rating: { average: 4.7, count: 210 },
    location: { label: "Indiranagar", city: "Bengaluru" },
    availability: "available",
    status: "active",
    description: "Scooter for short urban trips. No live GPS in this milestone.",
    specs: { seats: 2, fuel: "Petrol", transmission: "Automatic" },
  },
  {
    id: "demo-bus-pune",
    isDemoData: true,
    category: "bus",
    brand: "Ashok Leyland",
    model: "Sunshine",
    registrationNumber: "MH14NP9090",
    vendorName: "Deccan Coaches",
    vendorVerified: true,
    images: [],
    pricing: { amount: 1400000, currency: "INR", unit: "day" },
    rating: { average: 4.3, count: 15 },
    location: { label: "Swargate", city: "Pune" },
    availability: "maintenance",
    status: "active",
    description: "Coach for events and intercity groups. Currently in maintenance.",
    specs: { seats: 35, fuel: "Diesel", transmission: "Manual" },
  },
  {
    id: "demo-nexon-pune",
    isDemoData: true,
    category: "car",
    brand: "Tata",
    model: "Nexon",
    registrationNumber: "MH12QR1287",
    vendorName: "Harbor Fleet",
    vendorVerified: true,
    images: [],
    pricing: { amount: 260000, currency: "INR", unit: "day" },
    rating: { average: 4.4, count: 54 },
    location: { label: "Hinjawadi", city: "Pune" },
    availability: "available",
    status: "draft",
    description: "Compact SUV listed as draft in the demo so filters can hide it from browse.",
    specs: { seats: 5, fuel: "Petrol", transmission: "Automatic" },
  },
];

export const DEMO_VENDOR_FLEET: DemoVehicle[] = DEMO_VEHICLES.filter(
  (vehicle) => vehicle.vendorName === "Harbor Fleet",
);

export function getDemoVehicleById(id: string): DemoVehicle | undefined {
  return DEMO_VEHICLES.find((vehicle) => vehicle.id === id);
}

export function getBrowsableDemoVehicles(): DemoVehicle[] {
  return DEMO_VEHICLES.filter((vehicle) => vehicle.status === "active");
}
