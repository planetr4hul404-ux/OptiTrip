# OptiTrip — One-Day Demonstration Project Plan

**Team:** 3 people · **Build time:** 1 day · **Goal:** a working, interactive college demonstration

## 1. Project goal

Build a small website where a user enters a pickup point and destination, chooses what matters most (cost, travel time, or reliability), and sees a ranked comparison of a few transport options. The demonstration should show the concept end to end; it does not need production quality, exhaustive coverage, or dependable real-world prices.

The main demonstration flow is:

1. Enter or select pickup and destination.
2. Request route distance and duration when the mapping service is available.
3. Show estimated options for walking, bus, auto-rickshaw, and cab.
4. Change the priority selector and see the ranking update.

## 2. One-day scope

### Must work

- A single-page website with pickup and destination inputs.
- Geocoding and a route distance/duration lookup if the public OpenStreetMap services are reachable.
- A clear comparison for at least three options (walking, bus, auto-rickshaw, cab); walking can be omitted for very short or impractical routes.
- Estimated fare, travel time, and availability/reliability label for each option.
- A simple priority selector: **Cheapest**, **Fastest**, or **Most reliable**. Selecting a priority reorders or highlights the recommended option.
- Loading, invalid-input, and service-error messages, with one prepared example route available if a public service is unavailable.

### Cut from the two-week plan

- Use a minimal Supabase backend to save demonstration queries and results; no accounts, saved-search UI, analytics, or admin screens.
- No Edge Functions, extra backend services, CI, or branch protection.
- No fare-provider integrations, live transit timetables, vehicle tracking, or real-time availability.
- No slider tuning, complex multi-factor personalization, polished map controls, or extra transport modes.
- No promise that the site is production-ready or that estimated values match actual local operators.

## 3. Simplest suitable stack

Use **Next.js (React) + TypeScript** for one page, with plain CSS (or a small existing CSS framework if already installed), and deploy it on **Vercel**. Use **Supabase** for a minimal backend that stores submitted queries and recommendation results. Keep fare estimates and ranking logic simple; avoid extra backend services or Edge Functions.

For maps and route data, use **Leaflet with OpenStreetMap tiles**, **Nominatim** for place search, and the public **OSRM demo routing service** for a route distance and duration. Call services from the browser for this demonstration, respect their usage policies, and avoid repeated or bulk requests.

Suggested layout:

```text
app/
  page.tsx                 # inputs, priority selector, results
  layout.tsx
lib/
  maps.ts                  # geocoding and route requests
  estimates.ts             # clearly labelled demo fare/availability estimates
  ranking.ts               # priority-based ordering
  supabase.ts              # Supabase client
supabase/
  schema.sql               # minimal queries and recommendations tables
```

Keep the route request shape simple: pickup and destination coordinates in; route distance in kilometres and duration in minutes out. Keep fare estimates and ranking as simple functions, and save each query and its displayed recommendations to Supabase. Configure the Supabase URL and anon key in Vercel environment variables.

## 4. Data honesty and calculation rules

Show users which values are measured from an external service and which are estimates.

| Value | Source for the demonstration | How to label it |
|---|---|---|
| Place coordinates | Nominatim geocoding when available | “Place search” or “Geocoded location” |
| Road route distance and baseline duration | OSRM public demo route when available | “Route estimate (OSRM)” |
| Bus, auto, and cab fares | Simple documented example formulas applied to route distance; choose plausible sample constants for the demo | “Estimated fare — illustrative, not a live quote” |
| Availability/reliability | Fixed, transparent demo assumptions or a simple heuristic | “Demo estimate — not live availability” |
| Mode-specific travel time | Route duration adjusted by documented multipliers or fixed assumptions | “Estimated time — varies in practice” |

Do **not** describe estimated fares or availability as live, guaranteed, or real-time values. Do not present a sample formula as an official tariff. If route lookup fails, tell the user that route data is unavailable and offer a clearly marked sample route or ask them to retry; never quietly present the sample as live data.

Use transparent example logic, for instance: walking time from distance and a walking-speed assumption; bus/auto/cab time from the road duration plus simple mode-specific assumptions; fares from distance-based demo formulas. Put assumptions and constants together in `estimates.ts` so the team can explain or adjust them quickly.

## 5. Ranking behavior

Keep recommendation logic explainable and robust. The simplest valid version is to sort by the selected priority:

- **Cheapest:** lowest estimated fare first.
- **Fastest:** lowest estimated travel time first.
- **Most reliable:** highest demo reliability/availability score first.

Display the chosen priority and a short reason such as “Lowest estimated fare” or “Shortest estimated time.” Mark reliability as a demo heuristic. A weighted formula is optional only if the basic comparison is complete and there is time; it is not required for this one-day build.

## 6. Team split for three people

| Person | Main responsibility | Concrete output |
|---|---|---|
| **A — UI, integration, and deployment lead** | Start the Next.js app, own the page layout and input/priority controls, connect the work, and deploy to Vercel | Running page with inputs, selector, integrated results, and Vercel deployment |
| **B — Maps and routing** | Handle place search, optional Leaflet map, route lookup, loading/errors, and clearly labelled fallback route | Location inputs and route distance/time or a clear failure state |
| **C — Estimates, Supabase, and demo QA** | Implement fare/time/reliability assumptions and priority sorting; create minimal Supabase tables and save queries/results; build comparison cards and labels; run the demo checklist | Estimates and ranking logic, Supabase persistence, readable result cards, and rehearsed demo |

Agree on the result data shape and estimate labels in the first 30 minutes. Person A integrates continuously while B and C expose small, working pieces early. Keep the first implementation simple: if map selection slows the team down, use text search and a basic location list; if live routing is unavailable, show an explicit error and use only a clearly marked sample route for the presentation. Reserve the final hour for end-to-end fixes and rehearsal rather than new features.
## 7. Hour-by-hour schedule

| Time | Focus | Expected checkpoint |
|---|---|---|
| **09:00–10:00** | Confirm scope, start the Next.js project, create the Supabase project and minimal query/results tables, agree on data shape, verify service access | App starts locally; Supabase is ready; one agreed result object shape |
| **10:00–11:00** | Build input form and priority selector; implement estimates and sorting with a temporary local route object | Inputs and selector render; changing priority changes the order |
| **11:00–12:00** | Add geocoding and route lookup; wire coordinates into distance/time | One real place pair can return a route, or a visible error is shown |
| **12:00–13:00** | Add result cards, mode estimates, source labels, and short recommendation reasons | Full comparison visible for a route |
| **13:00–13:30** | Break and reset | — |
| **13:30–14:30** | Integrate all parts; save a query and results to Supabase; configure Vercel environment variables and deploy; test service and fallback paths | End-to-end flow works locally and on the Vercel URL; persistence works |
| **14:30–15:30** | Check several input combinations, small-screen layout, and wording; fix only demo-blocking issues | No obvious failure in the demo flow; estimates clearly labelled |
| **15:30–16:00** | Freeze features, rehearse the demonstration, prepare a backup route and explain limitations | Team can present the working build consistently |

If the day starts at a different time, keep the same sequence and durations. Stop adding features at the integration checkpoint; use remaining time to fix the end-to-end flow.

## 8. Minimum testing and demo checklist

### Before presenting

- [ ] App starts from the project instructions on the team’s demonstration machine.
- [ ] Entering pickup and destination produces results or an understandable error.
- [ ] A valid example route displays distance and baseline route time when OSRM responds.
- [ ] Bus, auto, and cab show fare, time, and availability/reliability information; walking appears only when appropriate.
- [ ] Changing Cheapest, Fastest, and Most reliable visibly changes the leading recommendation when values differ.
- [ ] Fare and reliability fields say they are estimates, not live values.
- [ ] Empty or unrecognized locations do not crash the page.
- [ ] A service failure is visible and the sample fallback is clearly identified as sample data.
- [ ] The team has one known-good route and can explain the ranking and assumptions.

### Suggested demonstration sequence

1. Enter a familiar pickup and destination.
2. Show route-derived distance/time and identify the source.
3. Compare the transport cards and call out the estimate labels.
4. Switch from Cheapest to Fastest to Most reliable and explain the changed recommendation.
5. Briefly mention the service fallback and the limitations below.

## 9. Explicit limitations and future work

- Public geocoding and routing services may be slow, unavailable, rate-limited, or unsuitable for sustained use; this demo makes only modest requests.
- OSRM’s route is a routing estimate, not guaranteed traffic-aware travel time. A driving route duration does not provide authoritative bus schedules or mode-specific travel times.
- Fare formulas use illustrative constants and may not match local tariffs, surge pricing, tolls, minimum fares, or operator-specific rules.
- Availability and reliability are assumed demonstration values, not observations of nearby vehicles or service disruptions.
- The recommendation compares a small set of modes using simplified criteria; it does not cover transfers, accessibility, safety, weather, live transit, or every route constraint.
- Supabase stores only minimal demonstration query and recommendation data; there is no authentication, user-facing history, or production monitoring. The Vercel deployment is for demonstration, not production service.
- Future work, if the course continues, could validate local fares, add real transit data, improve mode-specific routing, and harden the deployed application.

## 10. Definition of done

The project is complete for the one-day goal when the team can run the site locally and from its Vercel URL, enter a pickup and destination, see a clear comparison of transport recommendations, switch priorities and observe the ranking change, save the query and results to Supabase, and explain which data is route-derived versus estimated. Visual polish and production readiness are outside the demo success criteria.


