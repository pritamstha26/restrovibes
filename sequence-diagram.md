# RestroVibes - System Sequence Diagrams

## 1. Authentication Flow

```mermaid
sequenceDiagram
    actor Client
    actor Restaurateur
    participant FE as Frontend<br/>(React SPA)
    participant API as Express API<br/>(:5000)
    participant Auth as Auth Middleware
    participant DB as PostgreSQL
    participant Mail as Nodemailer

    Note over Client,Mail: === REGISTRATION ===
    Client->>FE: Fill sign-up form (name, email, password, phone, role)
    FE->>API: POST /api/auth/register
    API->>DB: Hash password (bcrypt) + Create user
    DB-->>API: User created
    API->>API: Generate JWT access + refresh tokens
    API-->>FE: 201 { tokens, user }
    FE->>FE: Store tokens in sessionStorage

    Note over Client,Mail: === LOGIN ===
    Client->>FE: Enter email + password + role
    FE->>API: POST /api/auth/login
    API->>DB: Find user + compare password (bcrypt)
    DB-->>API: User found + password valid
    API->>API: Generate JWT access (1h) + refresh (7d)
    API-->>FE: { accessToken, refreshToken, user }
    FE->>FE: Store in sessionStorage, redirect to dashboard

    Note over Client,Mail: === AUTHENTICATED REQUEST ===
    FE->>API: GET /api/some-resource<br/>Authorization: Bearer <token>
    API->>Auth: Validate JWT token
    Auth->>DB: Look up user by decoded ID
    DB-->>Auth: User exists + active
    Auth->>Auth: Attach req.user
    Auth->>API: Forward to route handler
    API-->>FE: 200 { data }

    Note over Client,Mail: === TOKEN REFRESH (on 401) ===
    FE->>API: Original request fails → 401
    FE->>API: POST /api/auth/refresh-token<br/>{ refreshToken }
    API->>DB: Validate refresh token
    API->>API: Generate new access + refresh tokens
    API-->>FE: { accessToken, refreshToken }
    FE->>API: Retry original request with new token
    API-->>FE: 200 { data }

    Note over Client,Mail: === FORGOT PASSWORD ===
    Client->>FE: Enter email
    FE->>API: POST /api/auth/forgot-password
    API->>API: Generate crypto reset token
    API->>Mail: Send reset link email
    Mail-->>Client: Email with reset link
    Client->>FE: Click link → Enter new password
    FE->>API: POST /api/auth/reset-password<br/>{ token, newPassword }
    API->>DB: Update password (bcrypt hashed)
    API-->>FE: 200 Password reset successful
```

---

## 2. Restaurant Discovery (GPS-Based)

```mermaid
sequenceDiagram
    actor Client
    participant FE as Frontend<br/>(React SPA)
    participant Browser as Browser<br/>Geolocation API
    participant API as Express API
    participant DB as PostgreSQL
    participant Map as Leaflet<br/>(OpenStreetMap)

    Client->>FE: Navigate to /client/nearby-restaurants
    FE->>Browser: navigator.geolocation.getCurrentPosition()
    Browser-->>FE: { latitude, longitude }
    FE->>API: GET /api/location/nearby-restaurateurs<br/>?latitude=X&longitude=Y
    API->>DB: Fetch all restaurateurs with locations
    DB-->>API: Restaurateur list
    API->>API: Haversine distance calculation<br/>for each restaurateur
    API->>API: Calculate ETA (distance / 30 km/h)
    API->>API: Calculate occupancy rate<br/>(active seats / total capacity)
    API-->>FE: 200 [{ restaurant, distance, eta,<br/>occupancyRate, seatsRemaining }]
    FE->>Map: Render markers on Leaflet map
    Map-->>Client: Interactive map with restaurant pins
    Client->>FE: Click restaurant marker
    FE->>API: GET /api/appointments/restaurateurs/:id
    API-->>FE: Restaurant details + services + available slots
```

---

## 3. Booking Flow (With Lottery System)

```mermaid
sequenceDiagram
    actor Client
    actor Restaurateur
    participant FE as Frontend
    participant API as Express API
    participant DB as PostgreSQL
    participant Score as ScoringEngine
    participant Lottery as WeightedLottery
    participant Worker as Auto-Accept Worker<br/>(every 2 min)
    participant Scheduler as Lottery Scheduler<br/>(every 60s)

    Note over Client,Scheduler: === CLIENT CREATES APPOINTMENT ===
    Client->>FE: Select service, date/time, party size
    FE->>API: POST /api/appointments/<br/>{ service_id, date, party_size, items[] }
    API->>API: Validate: future date, opening hours,<br/>1-hour gap rule
    API->>DB: Check table availability + seat capacity
    DB-->>API: Available

    alt Slot UNCONTESTED (no competing bookings)
        API->>DB: Create appointment (status="accepted")
        API-->>FE: 201 { appointment, status: "accepted" }
        Note right of API: Booking confirmed immediately

    else Slot CONTESTED (2+ clients same slot)
        API->>Score: Calculate client weight
        Score->>Score: weight = BASE(100)<br/>+ (flexibility × 50)<br/>+ (loyalty × 30)<br/>- (penalty × 200)
        Score-->>API: weight = 145
        API->>DB: Create appointment (status="pending")<br/>+ Insert into LotteryPool
        API-->>FE: 201 { appointment, status: "pending" }
        Note right of API: Enters lottery queue
    end

    Note over Client,Scheduler: === AUTO-ACCEPT WORKER (background) ===
    loop Every 2 minutes
        Worker->>DB: Find pending appointments > 20 min old
        DB-->>Worker: List of pending appointments
        loop For each contested slot
            alt Slot has exactly 1 pending (no competition)
                Worker->>DB: Update status → "accepted"
                Worker-->>Restaurateur: Notification: new accepted booking
            else Slot has 2+ pending (competition)
                Note over Worker: Leave for lottery resolution
            end
        end
    end

    Note over Client,Scheduler: === LOTTERY SCHEDULER (background) ===
    loop Every 60 seconds
        Scheduler->>DB: Find slots with 2+ lottery entries
        DB-->>Scheduler: Contested slots
        loop For each contested slot
            Scheduler->>DB: Fetch all lottery entries for slot
            Scheduler->>Lottery: Weighted random selection<br/>(with aging half-life boost)
            Lottery-->>Scheduler: Winner + Losers
            Scheduler->>DB: Winner → status="accepted"
            Scheduler->>DB: Losers → status="cancelled"
            Scheduler-->>Restaurateur: Notification: booking confirmed
            Scheduler-->>Client: Notification: lottery result
        end
    end
```

---

## 4. Appointment Lifecycle (Full State Machine)

```mermaid
sequenceDiagram
    actor Client
    actor Restaurateur
    participant API as Express API
    participant DB as PostgreSQL
    participant Overstay as Overstay Worker<br/>(every 60s)
    participant Score as ScoringEngine

    Note over Client,Score: === RESTAURATEUR MANAGES APPOINTMENT ===

    Restaurateur->>API: PUT /api/appointments/:id/confirm
    API->>DB: Update status → "accepted"
    API-->>Restaurateur: Confirmed

    Restaurateur->>API: PUT /api/appointments/:id/arrived
    API->>API: Check lateness: (now - scheduledTime) / 60
    alt Client is >15 min late
        API->>DB: Create BookingHistory (status="late_arrival")
        API->>Score: Recalculate client penalty
        Score->>Score: penalty += lateArrivals × 0.4
        Score-->>API: Updated penalty score
    end
    API->>DB: Update status → "in_progress"
    API-->>Restaurateur: Marked as arrived

    Restaurateur->>API: PUT /api/appointments/:id/complete
    API->>DB: Update status → "completed"
    API->>DB: Create BookingHistory (status="completed")
    API->>Score: Recalculate client penalty (positive)
    Score-->>API: Updated penalty score
    API-->>Restaurateur: Appointment completed

    Note over Client,Score: === CLIENT REQUESTS EXTENSION ===
    Client->>API: POST /api/appointments/:id/extend<br/>{ extra_minutes: 30 }
    API->>DB: Re-check seat capacity for extension window
    API->>DB: Update extended_until + end_time
    API-->>Client: Extended successfully

    Note over Client,Score: === CLIENT CANCELS ===
    Client->>API: PUT /api/appointments/:id/cancel
    API->>DB: Update status → "cancelled"
    API-->>Client: Cancelled

    Note over Client,Score: === OVERSTAY WORKER (background) ===
    loop Every 60 seconds
        Overstay->>DB: Find in_progress appointments<br/>past end_time + 10 min grace
        loop For each overstayed appointment
            Overstay->>DB: Update status → "completed"<br/>+ Create BookingHistory (status="overstayed")
            Overstay->>Score: Recalculate client penalty
            Score->>Score: penalty += overstays × 0.15
            Score-->>Overstay: Updated score
        end

        Overstay->>DB: Find pending/accepted appointments<br/>past end_time + grace (never started)
        loop For each no-show
            Overstay->>DB: Update status → "no_show"<br/>+ Create BookingHistory (status="no_show")
            Overstay->>Score: Recalculate client penalty
            Score->>Score: penalty += noShows × 0.7
            Score-->>Overstay: Updated score
        end
    end
```

---

## 5. Client Reliability Scoring

```mermaid
sequenceDiagram
    participant API as Express API
    participant Score as ScoringEngine
    participant DB as PostgreSQL
    participant RestaurateurUI as Restaurateur<br/>Dashboard

    Note over API,RestaurateurUI: === SCORING ALGORITHM ===
    API->>Score: calculatePenalty(userId)
    Score->>DB: Fetch BookingHistory for user
    DB-->>Score: { no_shows, late_arrivals,<br/>late_cancellations, overstays,<br/>completed, total }

    Score->>Score: rawPenalty = (noShows×0.7<br/>+ lateArrivals×0.4<br/>+ lateCancellations×0.3<br/>+ overstays×0.15) / totalBookings
    Score->>Score: completionRatio = completed / total
    Score->>Score: decay = min(completionRatio×0.15,<br/>rawPenalty×0.3)
    Score->>Score: penaltyScore = max(0,<br/>rawPenalty - decay)
    Score-->>API: penaltyScore = 0.23

    API->>API: Classify status
    Note right of API: 0 - 0.15 → "reliable" 🟢<br/>0.15 - 0.4 → "at_risk" 🟡<br/>> 0.4 → "flagged" 🔴
    API->>DB: Update user penalty_score + status

    Note over API,RestaurateurUI: === RESTAURATEUR VIEWS CLIENT RISK ===
    RestaurateurUI->>API: GET /api/appointments/:id
    API->>DB: Fetch appointment + client risk data
    API-->>RestaurateurUI: { appointment, clientRisk:<br/>{ status, penaltyScore, history } }
    RestaurateurUI->>RestaurateurUI: Display ClientRiskPopover<br/>(color-coded risk badge)
```

---

## 6. Bidirectional Rating System

```mermaid
sequenceDiagram
    actor Client
    actor Restaurateur
    participant API as Express API
    participant DB as PostgreSQL

    Note over Client,DB: === AFTER APPOINTMENT COMPLETED ===

    Client->>API: POST /api/ratings/<br/>{ appointmentId, targetType: "restaurateur",<br/>score: 5, comment: "Great food!" }
    API->>DB: Insert rating (client → restaurateur)
    DB-->>API: Rating created
    API->>DB: Calculate new average for restaurateur
    API-->>Client: Rating submitted

    Restaurateur->>API: POST /api/ratings/<br/>{ appointmentId, targetType: "client",<br/>score: 4, comment: "Good customer" }
    API->>DB: Insert rating (restaurateur → client)
    DB-->>API: Rating created (enforced: 1 per direction per appointment)
    API->>DB: Calculate new average for client
    API-->>Restaurateur: Rating submitted

    Note over Client,DB: === VIEW RATINGS ===
    Client->>API: GET /api/ratings/average/restaurateur/:id
    API->>DB: AVG(score) WHERE targetType="restaurateur"
    API-->>Client: { average: 4.5, count: 12 }

    Restaurateur->>API: GET /api/ratings/average/client/:id
    API->>DB: AVG(score) WHERE targetType="client"
    API-->>Restaurateur: { average: 4.2, count: 8 }
```

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Client      │  │   Server     │  │   Database   │  │
│  │   (Vite:5173) │──│  (Express    │──│  (PostgreSQL │  │
│  │   React SPA   │  │   :5000)     │  │   :5433)     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                │                    │          │
│   Bootstrap 5       JWT Auth           Sequelize ORM     │
│   Tailwind CSS      Middleware         Migrations        │
│   Leaflet Map       Background Workers                   │
│   Axios + Interceptors  ┌─────────────┐                 │
│                         │  Workers:    │                 │
│                         │  • Overstay  │                 │
│                         │  • AutoAccpt │                 │
│                         │  • Lottery   │                 │
│                         └─────────────┘                 │
└─────────────────────────────────────────────────────────┘
```
