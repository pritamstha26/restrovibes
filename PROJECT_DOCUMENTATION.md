# RestroVibes — Project Documentation

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Database Schema](#4-database-schema)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Core Algorithms](#6-core-algorithms)
7. [Background Workers](#7-background-workers)
8. [API Design](#8-api-design)
9. [Key Features](#9-key-features)
10. [Deployment](#10-deployment)

---

## 1. Project Overview

**RestroVibes** is a full-stack restaurant appointment booking platform that connects clients with restaurateurs. It features real-time seat management, client reliability scoring, dynamic pricing, GPS-based discovery, and automated appointment lifecycle management.

### Problem Statement
Restaurant no-shows cost the industry billions annually. Existing booking platforms lack intelligent mechanisms to track client reliability, manage seat capacity in real time, and resolve booking conflicts fairly.

### Solution
A three-role system (Client, Restaurateur, Admin) with:
- Real-time appointment booking with capacity enforcement
- Client reliability scoring that penalizes no-shows and late arrivals
- Automated appointment lifecycle (auto-accept, overstay detection)
- GPS-based nearby restaurant discovery
- Bidirectional rating system

---

## 2. Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19.0 | Component-based UI framework |
| Vite | 6.3 | Build tool and dev server (ESM-based, fast HMR) |
| React Router DOM | 7.5 | Client-side routing (SPA navigation) |
| Axios | 1.9 | HTTP client with JWT interceptors for token refresh |
| Bootstrap / React-Bootstrap | 5.3 / 2.10 | UI component library |
| Tailwind CSS | 3.4 | Utility-first CSS framework |
| Leaflet / React-Leaflet | 1.9 / 5.0 | Interactive map rendering (OpenStreetMap tiles) |
| React Icons / Lucide React | 5.5 / 0.510 | Icon libraries |
| React Datepicker | 8.4 | Date/time selection component |
| JWT Decode | 4.0 | Client-side token parsing |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | ES Modules | Runtime environment |
| Express | 5.1 | HTTP framework (routing, middleware) |
| Sequelize | 6.37 | SQL ORM (model definition, migrations, associations) |
| PostgreSQL (pg) | 8.14 | Relational database driver |
| bcrypt | 5.1 | Password hashing (salt rounds) |
| JSON Web Token (jsonwebtoken) | 9.0 | Stateless authentication (access + refresh tokens) |
| Nodemailer | 9.0 | Email delivery (password reset, confirmations) |
| Multer | 2.2 | File upload handling (multipart/form-data) |
| dotenv | 16.5 | Environment variable management |

### Database
| Technology | Version | Purpose |
|---|---|---|
| PostgreSQL | 14 (Alpine) | Primary data store (ACID, JSON support, ENUM types) |
| Docker | -- | Containerized database (isolated, reproducible) |

### DevOps
| Technology | Purpose |
|---|---|
| Docker Compose | Multi-container orchestration (db + server + client) |
| Nodemon | Auto-restart server on code changes (dev mode) |
| ESLint | Code quality enforcement |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────┐
│                   CLIENT (React)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  Client   │ │Restaur-  │ │     Admin        │ │
│  │Dashboard  │ │ateur UI  │ │     Panel        │ │
│  └─────┬────┘ └─────┬────┘ └────────┬─────────┘ │
│        │            │               │            │
│  ┌─────┴────────────┴───────────────┴─────────┐ │
│  │          Axios (JWT Interceptors)           │ │
│  └─────────────────────┬───────────────────────┘ │
└────────────────────────┼─────────────────────────┘
                         │ HTTP/REST
┌────────────────────────┼─────────────────────────┐
│                  SERVER (Express)                 │
│  ┌─────────────────────┴───────────────────────┐ │
│  │          Auth Middleware (JWT)               │ │
│  ├─────────────────────────────────────────────┤ │
│  │  Routes → Controllers → Models (Sequelize)  │ │
│  ├─────────────────────────────────────────────┤ │
│  │  ┌────────────┐ ┌───────────┐ ┌──────────┐ │ │
│  │  │Overstay    │ │Auto-Accept│ │ Scoring  │ │ │
│  │  │Worker      │ │Worker     │ │ Engine   │ │ │
│  │  │(60s cycle) │ │(2min cycle│ │          │ │ │
│  │  └────────────┘ └───────────┘ └──────────┘ │ │
│  └─────────────────────┬───────────────────────┘ │
└────────────────────────┼─────────────────────────┘
                         │
┌────────────────────────┼─────────────────────────┐
│              PostgreSQL Database                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  Users   │ │Appoint-  │ │Booking History   │ │
│  │  Model   │ │ments     │ │                  │ │
│  ├──────────┤ ├──────────┤ ├──────────────────┤ │
│  │  Tables  │ │Ratings   │ │Lottery Pool      │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Design Patterns
- **MVC (Model-View-Controller)**: Routes delegate to controllers, which interact with Sequelize models
- **Repository Pattern**: Models encapsulate database logic; controllers handle business logic
- **Middleware Chain**: Auth middleware validates JWT before route handlers execute
- **Observer/Worker Pattern**: Background workers independently monitor and update appointment states

---

## 4. Database Schema

### Entity Relationship Summary
```
UsersModel (1) ──── (N) AppointmentModel (N) ──── (1) RestaurateurService
     │                       │
     │                       │
     └─── (N) BookingHistoryModel
     │
     └─── (N) RatingModel (as rater or ratee)
     │
     └─── (N) TableModel (restaurateur only)
```

### Core Tables

#### UsersModel
| Field | Type | Description |
|---|---|---|
| id | INTEGER (PK) | Unique identifier |
| first_name, last_name | STRING | User name |
| email | STRING (UNIQUE) | Login credential |
| password | TEXT | bcrypt hashed |
| role | ENUM | `client`, `restaurateurs`, `admin` |
| latitude, longitude | DECIMAL(10,6) | GPS coordinates |
| opening_time, closing_time | TIME | Restaurant service hours |
| seat_capacity | INTEGER | Max concurrent seats |
| penalty_score | FLOAT | Computed reliability penalty (0-1) |
| total_no_shows, total_late_arrivals, total_late_cancellations | INTEGER | Cached penalty counters |
| is_flagged | BOOLEAN | True if penalty_score > 0.4 |
| reliability_status | ENUM | `reliable`, `at_risk`, `flagged` |

#### AppointmentModels
| Field | Type | Description |
|---|---|---|
| id | INTEGER (PK) | Unique identifier |
| date | DATE | Scheduled appointment time |
| serviceId | INTEGER (FK) | Reference to RestaurateurService |
| clientId | INTEGER (FK) | Reference to UsersModel |
| restaurateurId | INTEGER (FK) | Reference to UsersModel |
| status | ENUM | `pending`, `accepted`, `rejected`, `cancelled`, `in_progress`, `completed`, `no_show` |
| party_size | INTEGER | Number of people |
| table_id | INTEGER (FK) | Assigned table |
| actual_arrival_time | DATE | When client actually arrived |
| is_late | BOOLEAN | True if arrival was >15 min late |

#### BookingHistoryModel
| Field | Type | Description |
|---|---|---|
| user_id | INTEGER | Client reference |
| restaurant_id | INTEGER | Restaurateur reference |
| booking_date | DATEONLY | Date of booking |
| status | ENUM | `completed`, `late_cancelled`, `no_show`, `upcoming`, `overstayed`, `late_arrival` |

---

## 5. Authentication & Authorization

### JWT Token Flow
```
Client Login
    │
    ▼
Server validates credentials
    │
    ├── Access Token (short-lived) → API requests
    └── Refresh Token (long-lived) → stored in sessionStorage
    
Access Token expired?
    │
    ▼
Axios interceptor catches 401
    │
    ├── Sends refresh token to /api/auth/refresh-token
    ├── Receives new access + refresh tokens
    └── Retries original request
```

### Role-Based Access Control
| Role | Access |
|---|---|
| `client` | Book appointments, view own history, rate restaurants |
| `restaurateurs` | Manage services, accept/reject bookings, mark no-shows, view client risk profiles |
| `admin` | Full access to all users, restaurants, bookings |

### Password Security
- **bcrypt** with salt rounds for hashing (never stored in plaintext)
- **Forgot password** flow via Nodemailer (email with reset token, 1-hour expiry)
- Phone number validation: must be 10 digits starting with `98` or `97` (Nepal format)

---

## 6. Core Algorithms

### 6.1 Client Reliability Scoring Engine

The scoring engine computes a **penalty score** (0 to 1) for each client based on their booking behavior history.

#### Formula
```
rawPenalty = (noShows × 0.7 + lateArrivals × 0.4 + lateCancellations × 0.3 + overstays × 0.15) / totalBookings

completionRatio = completedBookings / totalBookings

decay = min(completionRatio × 0.15, rawPenalty × 0.3)

penaltyScore = max(0, rawPenalty - decay)
```

#### Weight Justification
| Behavior | Weight | Rationale |
|---|---|---|
| No-show | 0.7 | Highest impact — restaurant loses entire slot with no opportunity to rebook |
| Late arrival | 0.4 | Disrupts schedule but client still arrives |
| Late cancellation | 0.3 | Restaurant has some time to fill the slot |
| Overstay | 0.15 | Minor inconvenience, usually resolved by overstay worker |

#### Decay Mechanism
Completed bookings provide a **capped decay** — good behavior reduces penalty but never fully erases it:
- Maximum decay = 15% of completion ratio
- Hard cap = 30% of the raw penalty (prevents complete forgiveness)

#### Reliability Status Thresholds
| Penalty Score | Status | Visual Indicator |
|---|---|---|
| 0 – 0.15 | `reliable` | Green dot |
| 0.15 – 0.4 | `at_risk` | Yellow dot |
| > 0.4 | `flagged` | Red dot |

#### Example Calculation
A client with 5 no-shows, 7 completed bookings (12 total):
```
rawPenalty = (5 × 0.7) / 12 = 0.2917
completionRatio = 7 / 12 = 0.5833
decay = min(0.5833 × 0.15, 0.2917 × 0.3) = min(0.0875, 0.0875) = 0.0875
penaltyScore = 0.2917 - 0.0875 = 0.204 (20.4%)
Status: at_risk (yellow dot)
```

### 6.2 Late Arrival Detection

When a restaurateur marks a client as arrived (`PUT /:id/arrived`):
```
scheduledTime = appointment.date
arrivalTime = new Date()
diffMinutes = (arrivalTime - scheduledTime) / (1000 × 60)

if (diffMinutes > 15):
    is_late = true
    Create BookingHistory entry with status "late_arrival"
    Recalculate client penalty
```

### 6.3 Haversine Distance Calculation

Used for nearby restaurant discovery. Calculates great-circle distance between two GPS coordinates:

```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)
c = 2 × atan2(√a, √(1-a))
distance = R × c    (R = 6,371 km — Earth's radius)
```

**Why Haversine over routing APIs**: External routing APIs (Google Maps, Mapbox, OpenRouteService) were evaluated but rejected:
- Google Maps: Requires credit card, paid billing
- Mapbox: Demo token produces inaccurate distances
- OpenRouteService: Returns 403 (disallowed for this use case)

Haversine provides straight-line distance, which is sufficient for "nearby" discovery. The system estimates travel time at 30 km/h average speed.

### 6.4 Weighted Lottery System

Resolves slot conflicts when multiple clients book the same time slot at the same restaurant.

#### Weight Calculation
```
BASE_WEIGHT = 100
totalWeight = BASE_WEIGHT + (flexibilityScore × 50) + (loyaltyScore × 30) - (penaltyScore × 200)
```

Where:
- **flexibilityScore** (0-1): Based on `flexibilityRangeMinutes` (≤30min=0.4, ≤60min=0.7, >60min=1.0) + alternative date bonus
- **loyaltyScore** (0-1): Based on completed bookings at restaurant (≥6=1.0, ≥3=0.7, ≥1=0.4) + platform-wide history + account age

#### Selection Algorithm
1. Collect all pending lottery entries for the contested slot
2. Sort by weight (descending)
3. Select winner using weighted random selection (proportional to weight)
4. Winner's appointment → `accepted`; Losers → `cancelled`

**Coexistence with manual flow**: The lottery runs alongside manual accept/reject. Restaurateurs can manually accept/reject bookings before the lottery or auto-accept worker processes them.

### 6.5 Competing Bookings Detection

When fetching appointments for a restaurateur, the system calculates how many pending bookings compete for the same slot:

```
For each appointment:
    slotKey = restaurateurId + "_" + date.truncateToHour
    
    competing_count = count of "pending" appointments with same slotKey
```

Displayed as a badge: "2 competing" when `competing_count > 1`, helping restaurateurs identify conflicts at a glance.

---

## 7. Background Workers

### 7.1 Auto-Accept Worker
| Property | Value |
|---|---|
| Interval | Every 2 minutes |
| Grace period | 20 minutes (configurable via `AUTO_ACCEPT_GRACE_MINUTES`) |
| Purpose | Auto-accept solo pending bookings (no competition) |

**Logic**:
```
For each pending appointment older than grace period:
    Group by slot (restaurateur + hour)
    If slot has exactly 1 pending → auto-accept
    If slot has 2+ pending → leave for manual review
```

### 7.2 Overstay Worker
| Property | Value |
|---|---|
| Interval | Every 60 seconds |
| Grace period | 10 minutes (configurable via `OVERSTAY_GRACE_MINUTES`) |
| Purpose | Enforce appointment time limits |

**Logic**:
```
For each appointment past end_time + grace:
    If status == "in_progress" → mark as "completed" + create "overstayed" history
    If status == "pending"/"accepted" → mark as "no_show" + create "no_show" history
    Recalculate client penalty after each
```

### 7.3 Worker Interaction Flow
```
Client books → status: "pending"
         │
         ▼ (20 min, no competition)
    Auto-Accept Worker → status: "accepted"
         │
         ▼ (appointment time arrives)
    Restaurateur marks arrival or...
         │
         ▼ (end_time + 10 min passed)
    Overstay Worker → status: "completed" + "overstayed" history
         │
         ▼
    Scoring Engine recalculates penalty
```

---

## 8. API Design

### RESTful Conventions
- **Resources**: `/api/appointments`, `/api/users`, `/api/services`, `/api/tables`, `/api/ratings`, `/api/lottery`
- **HTTP Methods**: GET (read), POST (create), PUT (update), DELETE (remove)
- **Authentication**: Bearer token in `Authorization` header
- **Response Format**: `{ message: string, data: object }` or `{ error: string }`

### Key Endpoints Summary
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth/register` | POST | User registration (JWT tokens returned) |
| `/api/auth/login` | POST | User login (JWT tokens returned) |
| `/api/auth/refresh-token` | POST | Token refresh |
| `/api/appointments/` | POST | Create appointment |
| `/api/appointments/restaurateurs/:id` | GET | Get restaurateur's appointments (with risk data) |
| `/api/appointments/:id/confirm` | PUT | Accept appointment |
| `/api/appointments/:id/cancel` | PUT | Cancel appointment |
| `/api/appointments/:id/complete` | PUT | Mark completed |
| `/api/appointments/:id/no-show` | PUT | Mark no-show (penalty applied) |
| `/api/appointments/:id/arrived` | PUT | Mark arrival (late detection) |
| `/api/appointments/client/:id/risk-profile` | GET | Client risk profile for restaurateurs |
| `/api/location/nearby-restaurateurs` | GET | GPS-based restaurant discovery |
| `/api/ratings/` | POST | Submit bidirectional rating |

### Rate Limiting & Validation
- Phone validation: `/^(98|97)\d{8}$/` (Nepal format)
- Booking gap enforcement: Minimum 1-hour gap between same-restaurant bookings
- Service hours validation: Booking must fit within restaurant opening/closing times
- Seat capacity enforcement: Party size + existing occupancy ≤ seat_capacity

---

## 9. Key Features

### 9.1 Real-Time Seat Management
- Restaurateurs set `seat_capacity` (1-1000)
- Each appointment reserves `party_size` seats
- Available seats = `seat_capacity - sum(active party sizes)`
- Overstay worker auto-releases seats when appointments expire

### 9.2 GPS-Based Discovery
- Clients view nearby restaurants on an interactive Leaflet map
- Distance calculated via Haversine formula
- ETA estimated at 30 km/h average speed
- Occupancy rate displayed (seats remaining / total capacity)

### 9.3 Bidirectional Rating System
- Clients rate restaurateurs (1-5 stars) and vice versa
- One rating per appointment per direction (enforced by unique constraint)
- Average ratings calculated and displayed on profiles

### 9.4 Dynamic Pricing
- Slot-based surge pricing with demand visualization
- Price breakdown modal showing base price + surge multiplier
- Real-time demand indicator per time slot

### 9.5 Client Risk Assessment
- Restaurateurs see a colored dot next to client names (green/yellow/red)
- Clicking the dot opens a popover showing:
  - Client name and reliability status
  - Completed bookings, no-shows, late arrivals, late cancellations
  - Penalty score with visual progress bar
- Competing bookings count ("2 competing") shown when multiple clients want the same slot

### 9.6 Automated Lifecycle Management
- **Auto-accept**: Solo pending bookings accepted after 20-minute grace
- **Overstay detection**: In-progress appointments auto-completed after grace period
- **No-show marking**: Stale pending/accepted appointments auto-flagged
- **Penalty recalculation**: Automatic after every booking status change

---

## 10. Deployment

### Docker Compose Services
| Service | Image | Port | Purpose |
|---|---|---|---|
| `restrovibe-db` | `postgres:14-alpine` | 5433:5432 | PostgreSQL database |
| `restrovibe-server` | Node.js (custom) | 5000 | Express API server |
| `restrovibe-client` | Node.js (custom) | 5173 | Vite dev server |

### Environment Variables
| Variable | Purpose |
|---|---|
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | Database connection |
| `PORT` | Server port (default: 5000) |
| `OVERSTAY_GRACE_MINUTES` | Overstay detection grace (default: 10) |
| `AUTO_ACCEPT_GRACE_MINUTES` | Auto-accept grace (default: 20) |
| `VITE_MAP_TILE_URL` | Map tile URL for Leaflet |

### Database Migrations
The server runs column migrations at startup using `addColumnIfMissing()` — safely adding new columns without dropping existing data. PostgreSQL ENUM values are added via `ALTER TYPE ... ADD VALUE` for backward compatibility.

---

*Document generated for project defense preparation.*
