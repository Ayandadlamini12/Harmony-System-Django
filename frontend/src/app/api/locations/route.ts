import { City, State } from "country-state-city";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const country = (url.searchParams.get("country") || "SZ").toUpperCase();
  const state = url.searchParams.get("state") || "";
  const regions = State.getStatesOfCountry(country).map((region) => ({
    name: region.name,
    isoCode: region.isoCode
  }));
  const citySource = state ? City.getCitiesOfState(country, state) : City.getCitiesOfCountry(country);
  const towns = Array.from(new Set((citySource || []).map((city) => city.name))).sort((a, b) => a.localeCompare(b));

  return NextResponse.json({ regions, towns });
}
