# OptiTrip

# OptiTrip: Smart Multi-Modal Transportation Recommendation Platform

OptiTrip is an interactive multi-modal transportation recommendation platform built as a 2-week MVP by Group 16[cite: 1]. The system accepts an origin and destination pair and evaluates four transit modes—**Walk**, **Autorickshaw**, **Cab Aggregator**, and **Bus**—to output a single ranked recommendation based on a composite, customizable multi-criteria score[cite: 1].

---

## Overview & Architecture

OptiTrip operates as a stateless query platform backed by live data computations rather than hardcoded mock outputs[cite: 1, 2]:

* **Live Routing & Distance**: Queries OpenStreetMap via OSRM to extract live travel distances and durations for walking and driving profiles.
* **Live Geocoding**: Converts natural language addresses and POIs into coordinates using the Nominatim OpenStreetMap engine[cite: 2].
* **Rule-Based Fare Engines**: Computes fares based on published transit tariff schedules and distance/time metrics[cite: 2].
* **Availability Heuristic**: Calculates expected wait times and accessibility using time-of-day models[cite: 1, 2].
* **User-Weighted Multi-Criteria Scoring**: Normalizes price, travel time, and availability metrics, applying user-tuned weight sliders to rank transit options dynamically[cite: 1, 4].
* **Query Persistence**: Logs queries and computed mode results to Supabase for analysis and verification.

---

## Tech Stack

| Layer | Technology | Function |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js (React) + TypeScript[cite: 2] | App UI, priority controls, and reactive results display[cite: 2] |
| **Styling** | Tailwind CSS[cite: 2] | Responsive design and component styling[cite: 2] |
| **Mapping & Tiles** | Leaflet.js + OpenStreetMap[cite: 2] | Client-side map rendering, tile layer, and pin-drop handling[cite: 2, 4] |
| **Geocoding Engine** | Nominatim (OSM)[cite: 2] | Free forward geocoding (text $\rightarrow$ coordinates)[cite: 2] |
| **Routing Engine** | OSRM Public Demo Server[cite: 2] | Real road network distance and duration calculations[cite: 2] |
| **Database & BaaS** | Supabase (PostgreSQL)[cite: 2] | Schema storage for query history and mode rankings[cite: 2, 3] |
| **Deployment** | Vercel[cite: 1, 2] | Production hosting with continuous deployment from GitHub[cite: 2, 4] |

---

## Mathematical Models & Scoring Formulas

### 1. Multi-Criteria Scoring Formula
Recommendations are ordered according to the composite mode score $\text{Score}_m$:

$$\text{Score}_m = w_1 \cdot (1 - \text{norm}(P_m)) + w_2 \cdot (1 - \text{norm}(T_m)) + w_3 \cdot \text{norm}(A_m)$$
[cite: 4]

* **$\text{Score}_m$ (Final Mode Score)**:
  * Represents the aggregate desirability of mode $m$[cite: 3, 4].
  * Higher scores produce higher ranks in the final output.
* **$w_1, w_2, w_3$ (User Priority Weights)**:
  * $w_1$: Weight assigned to trip cost/price[cite: 1, 4].
  * $w_2$: Weight assigned to travel duration/time[cite: 1, 4].
  * $w_3$: Weight assigned to transit reliability/availability[cite: 1, 4].
  * Weights are constrained such that $w_1 + w_2 + w_3 = 1$[cite: 4].
* **$\text{norm}(P_m)$ (Normalized Price)**:
  * Calculated as $\text{norm}(P_m) = \frac{P_m - P_{\min}}{P_{\max} - P_{\min}}$ across the evaluated modes.
  * Measures relative cost across choices.
* **$(1 - \text{norm}(P_m))$ (Inverted Price Metric)**:
  * Inverts the normalized price so that lower fares produce higher utility[cite: 4].
* **$\text{norm}(T_m)$ (Normalized Travel Time)**:
  * Calculated as $\text{norm}(T_m) = \frac{T_m - T_{\min}}{T_{\max} - T_{\min}}$ across the evaluated modes.
  * Measures relative trip duration across choices.
* **$(1 - \text{norm}(T_m))$ (Inverted Time Metric)**:
  * Inverts the normalized duration so that faster trips produce higher utility[cite: 4].
* **$\text{norm}(A_m)$ (Normalized Availability)**:
  * Represents the normalized availability heuristic for mode $m$ derived from time-of-day curves[cite: 2, 4].
  * Higher availability yields a higher utility score directly[cite: 4].

---

### 2. Mode Fare Formulations
Fares are computed systematically using real distance $d$ (in kilometers) and travel duration $t$ (in minutes) supplied by OSRM[cite: 2, 4]:

* **Walking**:
  * $$\text{Fare}_{\text{walk}} = 0$$[cite: 4]
  * Pedestrian travel incurs no monetary tariff[cite: 4].
* **Autorickshaw**:
  * $$\text{Fare}_{\text{auto}} = \text{Base Fare} + \max(0, d - d_{\text{base}}) \times \text{Rate}_{\text{per\_km}}$$[cite: 2, 4]
  * Implements published government meter pricing with a standard minimum base distance $d_{\text{base}}$[cite: 2, 4].
* **Bus**:
  * $$\text{Fare}_{\text{bus}} = \text{TariffSlab}(d)$$[cite: 4]
  * Evaluated via fixed distance bracket slabs based on regional public bus fare charts[cite: 4].
* **Cab Aggregator**:
  * $$\text{Fare}_{\text{cab}} = \text{Base Fare} + (d \times \text{Rate}_{\text{per\_km}}) + (t \times \text{Rate}_{\text{per\_min}})$$[cite: 2, 4]
  * Models real-world ride-hailing pricing factoring in both distance traversed and duration spent[cite: 2].

---

## Database Schema

The database relies on two relational tables inside Supabase[cite: 2, 3]:

### `queries`
Stores origin and destination coordinates for each search.
* `id` (`uuid`, primary key, default `gen_random_uuid()`)
* `pickup_lat` (`double precision`, not null)
* `pickup_lng` (`double precision`, not null)[cite: 3]
* `dest_lat` (`double precision`, not null)[cite: 3]
* `dest_lng` (`double precision`, not null)[cite: 3]
* `created_at` (`timestamptz`, default `now()`)[cite: 3]

### `recommendations`
Stores each transport mode's computed metrics and scoring rank per query[cite: 3].
* `id` (`uuid`, primary key, default `gen_random_uuid()`)
* `query_id` (`uuid`, foreign key referencing `queries(id)`)[cite: 3]
* `mode` (`text`, check constraint: `walk`, `autorickshaw`, `cab`, `bus`)[cite: 1, 3]
* `price` (`numeric`, not null)[cite: 3]
* `time` (`numeric`, not null, in minutes)[cite: 3]
* `availability_score` (`numeric`, not null)[cite: 3]
* `final_score` (`numeric`, not null)[cite: 3]
* `rank` (`integer`, not null)[cite: 3]

---

## API Contract

* `POST /api/geocode`[cite: 3, 4]
  * **Input**: `{ "query": "Swargate, Pune" }`
  * **Output**: `{ "lat": 18.5018, "lng": 73.8586, "displayName": "..." }`
* `POST /api/route`[cite: 3, 4]
  * **Input**: `{ "origin": [lat, lng], "destination": [lat, lng], "profile": "driving" | "walking" }`[cite: 2, 4]
  * **Output**: `{ "distanceKm": 5.4, "durationMin": 18.2, "geometry": "..." }`
* `POST /api/recommend`[cite: 3, 4]
  * **Input**:
    ```json
    {
      "origin": { "lat": 18.5204, "lng": 73.8567 },
      "destination": { "lat": 18.5018, "lng": 73.8586 },
      "weights": { "cost": 0.5, "speed": 0.3, "reliability": 0.2 }
    }
    ```
  * **Output**:
    ```json
    {
      "queryId": "uuid-here",
      "results": [
        {
          "mode": "bus",
          "price": 15.0,
          "time": 25.0,
          "availabilityScore": 0.75,
          "finalScore": 0.82,
          "rank": 1,
          "explanation": "Most cost-effective mode with reliable daytime frequency."
        }
      ]
    }
    ```
   [cite: 3, 4]

---

## Getting Started

### 1. Prerequisites
* Node.js 18.x or later
* npm, pnpm, or yarn
* A Supabase project instance[cite: 4]

### 2. Setup Repository
```bash
git clone <your-repository-url>
cd optitrip
npm install
