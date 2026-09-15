# Test Cases — RestroVibes

## 4.2 Testing

### 4.2.1 Unit Testing

**Table 1: Test Case for User Registration of RestroVibes**

| S. No | Test Name | Input | Expected Output | Actual Output | Test Result |
|-------|-----------|-------|-----------------|---------------|-------------|
| 1 | Register with valid details | Email: ram123@gmail.com, Name: Ram Shrestha, Password: Trek@2082, Phone: 9841234567 | Account created, JWT token returned | Account created, JWT token returned | Pass |
| 2 | Register with duplicate email | Email: ram123@gmail.com (already exists) | 409 "Email already in use" error | 409 "Email already in use" error | Pass |
| 3 | Register with invalid phone format | Phone: 1234567890 (not 98/97 prefix) | 400 "Invalid phone number" error | 400 "Invalid phone number" error | Pass |
| 4 | Register with weak password | Password: 123 | 400 "Password must be at least 6 characters" error | 400 "Password must be at least 6 characters" error | Pass |
| 5 | Non-admin attempts to register as admin | Role: admin (from client user) | 403 "Only admins can assign this role" error | 403 "Only admins can assign this role" error | Pass |

**Table 2: Test Case for User Login of RestroVibes**

| S. No | Test Name | Input | Expected Output | Actual Output | Test Result |
|-------|-----------|-------|-----------------|---------------|-------------|
| 1 | Login with valid credentials | Email: ram123@gmail.com, Password: Trek@2082 | JWT token returned, user role in payload | JWT token returned, user role in payload | Pass |
| 2 | Login with correct email and wrong password | Email: ram123@gmail.com, Password: WrongPass1 | 401 "Invalid email or password" message | 401 "Invalid email or password" message | Pass |
| 3 | Login with unregistered email | Email: ghost@gmail.com | 401 "Invalid email or password" message | 401 "Invalid email or password" message | Pass |

**Table 3: Test Case for Appointment Booking Validation of RestroVibes**

| S. No | Test Name | Input | Expected Output | Actual Output | Test Result |
|-------|-----------|-------|-----------------|---------------|-------------|
| 1 | Book with valid data, no existing contest | Table A (capacity 4), party_size: 2, date: 2026-09-15T10:00, slot 40, restaurant hours 09:00–18:00 | Appointment created, status = accepted | Appointment created, status = accepted | Pass |
| 2 | Book outside restaurant service hours | date: 2026-09-15T02:00 (restaurant opens 09:00) | 400 "Booking outside service hours" error | 400 "Booking outside service hours" error | Pass |
| 3 | Book violating one-hour gap rule | Existing accepted appointment at 10:00, new request at 10:30 | 409 "Minimum one-hour gap required" error | 409 "Minimum one-hour gap required" error | Pass |
| 4 | Book exceeding restaurant seat capacity | Active seats in use: 8, seat_capacity: 10, party_size: 3 | 409 "Seat capacity exceeded" error | 409 "Seat capacity exceeded" error | Pass |
| 5 | Book with time slot index out of range | preferred_time_slot: 96 | 400 "Time slot must be between 0 and 95" error | 400 "Time slot must be between 0 and 95" error | Pass |
| 6 | Book with negative party size | party_size: -1 | 400 validation error | 400 validation error | Pass |

**Table 4: Test Case for Scoring Engine — Base Weight Calculation of RestroVibes**

| S. No | Test Name | Input / DB State | Expected Output | Actual Output | Test Result |
|-------|-----------|------------------|-----------------|---------------|-------------|
| 1 | High-score client: full loyalty, no infractions | 8 completed bookings at restaurant, 12 total platform-wide, account age 400 days, 0 infractions, flexibility_range_minutes: 60 | loyalty = 1.0, penalty = 0, W = 100 + 35 + 30 − 0 = **165** | 165 | Pass |
| 2 | Low-score client: few bookings, 1 no-show | 1 completed at restaurant, 3 total platform-wide, account age 40 days, 1 no-show in history, flexibility_range_minutes: 15 | loyalty ≈ 0.36, penalty ≈ 0.163, W ≈ **98.13** | 98.13 | Pass |
| 3 | Client at penalty floor (maximum penalty) | penalty = 1.0, flex = 1.0, loyalty = 1.0 → 100 + 50 + 30 − 200 = −20 | W floored to **1** | 1 | Pass |
| 4 | Maximum base weight (perfect profile) | penalty = 0, flex = 1.0, loyalty = 1.0 → 100 + 50 + 30 − 0 | W = **180** | 180 | Pass |
| 5 | Zero flexibility (window ≤ 30 min) | flexibility_range_minutes: 10 | flexibility score = **0.4**, W contribution = +20 | 0.4, +20 | Pass |
| 6 | Full flexibility (window > 60 min) | flexibility_range_minutes: 90 | flexibility score = **1.0**, W contribution = +50 | 1.0, +50 | Pass |

**Table 5: Test Case for Contested Slot Detection of RestroVibes**

| S. No | Test Name | Input | Expected Output | Actual Output | Test Result |
|-------|-----------|-------|-----------------|---------------|-------------|
| 1 | Second request on same slot enters lottery pool | User A already booked slot 34 (restaurant R, date 2026-09-15, status = pending), User B requests same slot | User B entry created in lottery_pool with status = pending, weight stored | Entry created, status = pending, weight stored | Pass |
| 2 | First request on empty slot confirmed directly | No pending entries exist at slot 34 for restaurant R on 2026-09-15 | Appointment status = accepted, no lottery_pool entry created | Appointment status = accepted, no pool entry | Pass |

**Table 6: Test Case for Time-Decay Aging / Boost of RestroVibes**

| S. No | Test Name | Age (hours) | Expected Boost | Expected W_eff | Actual Output | Test Result |
|-------|-----------|-------------|----------------|----------------|---------------|-------------|
| 1 | Fresh entry (no waiting) | 0 | 1 + min(0, 3) = **×1.0** | W × 1.0 | W × 1.0 | Pass |
| 2 | Six-hour half-life point | 6 | 1 + min(1.5, 3) = **×2.5** | W × 2.5 | W × 2.5 | Pass |
| 3 | Twelve hours waited | 12 | 1 + min(2.25, 3) = **×3.25** | W × 3.25 | W × 3.25 | Pass |
| 4 | Twenty-four hours waited | 24 | 1 + min(2.81, 3) ≈ **×3.81** | W × 3.81 | W × 3.81 | Pass |
| 5 | Forty-eight hours (approaches cap) | 48 | 1 + min(2.99, 3) ≈ **×3.99** | W × 3.99 | W × 3.99 | Pass |

**Table 7: Test Case for Weighted Random Draw of RestroVibes**

| S. No | Test Name | Input / DB State | Expected Output | Actual Output | Test Result |
|-------|-----------|------------------|-----------------|---------------|-------------|
| 1 | Aged entry overtakes fresh higher-weight rival | B: base 98.13, 24h aged (eff ≈ 374.1) vs A: base 165, fresh (eff = 165), injected random = 0.42 | P(B) ≈ 69%, P(A) ≈ 31% — B selected as winner | P(B) ≈ 69%, P(A) ≈ 31%, B wins | Pass |
| 2 | Inferior entry cannot overtake below quarter rule | X: base 30, max boost ×4 = 120 vs Y: base 140, boost ×1 = 140 | X never exceeds Y at any aging level; X cannot win | X effective weight always < Y | Pass |
| 3 | Two equal fresh entries — fair coin flip | A: base 120, fresh; B: base 120, fresh | P(A) = P(B) = 50% | P(A) = P(B) = 50% | Pass |

**Table 8: Test Case for Resolution & Appointment Lifecycle of RestroVibes**

| S. No | Test Name | Input | Expected Output | Actual Output | Test Result |
|-------|-----------|-------|-----------------|---------------|-------------|
| 1 | Winner confirmed on lottery resolve | Entry A wins draw at slot 34 | lottery_pool.status = won, appointment.status = accepted, winnerChance returned to client | Won, accepted, chance returned | Pass |
| 2 | Loser cancelled on lottery resolve | Entry B loses draw at slot 34 | lottery_pool.status = lost, appointment.status = cancelled | Lost, cancelled | Pass |
| 3 | Mark arrival on time | actual_arrival_time within 15 min of appointment date | is_late = false, appointment updated | is_late = false | Pass |
| 4 | Mark arrival late | actual_arrival_time > 15 min after appointment date | is_late = true, appointment updated | is_late = true | Pass |
| 5 | No-show triggers penalty recalculation | Restaurateur marks no-show, client has 3 total bookings, 1 no-show | penalty_score recalculated via recalculateUserPenalty(), reliability_status updated | Penalty recalculated, status updated | Pass |
| 6 | Cancel appointment without providing reason | PUT /api/appointments/:id/cancel with cancellation_reason blank | 400 "Cancellation reason is required" error | 400 "Cancellation reason is required" error | Pass |
| 7 | Manual lottery resolve without admin role | POST /api/lottery/resolve (role = client) | 403 Unauthorized | 403 Unauthorized | Pass |

### 4.2.2 System Testing

**Table 9: Test Cases for System Testing — User (Client) of RestroVibes**

| S. N | Test Case | Expected Outcome | Actual Result | Remarks |
|------|-----------|------------------|---------------|---------|
| 1 | Client registers with valid details | Account created, JWT returned | Account created, JWT returned | Pass |
| 2 | Client logs in with valid credentials | Authenticated, redirected to dashboard | Logged in successfully | Pass |
| 3 | Client browses available restaurant services | Services displayed with price, duration, availability | Services displayed successfully | Pass |
| 4 | Client books a service with valid data, no contest | Appointment created, status = accepted | Appointment accepted | Pass |
| 5 | Client views appointment history | Previous and current appointments displayed | Appointment history displayed | Pass |
| 6 | Client requests time extension on active appointment | Extension request created, extension_status = pending | Extension request created | Pass |

**Table 10: Test Cases for System Testing — Restaurateur of RestroVibes**

| S. N | Test Case | Expected Outcome | Actual Result | Remarks |
|------|-----------|------------------|---------------|---------|
| 1 | Restaurateur logs in with valid credentials | Authenticated, redirected to dashboard | Logged in successfully | Pass |
| 2 | Restaurateur creates a service with valid data | Service added to catalogue, price and duration saved | Service added successfully | Pass |
| 3 | Restaurateur confirms a pending appointment for verified client | Appointment status = accepted, confirmed_at set | Appointment confirmed | Pass |
| 4 | Restaurateur confirms appointment for unverified client | 403 CustomerNotVerifiedError | 403 CustomerNotVerifiedError | Pass |
| 5 | Restaurateur marks client arrival | actual_arrival_time recorded, is_late flag set if applicable | Arrival recorded | Pass |
| 6 | Restaurateur marks no-show on missed appointment | Appointment status = no_show, penalty_score recalculated | No-show recorded, penalty updated | Pass |
| 7 | Restaurateur manually resolves a contested slot | lottery_pool entries resolved, winner = won/accepted, losers = lost/cancelled | Lottery resolved | Pass |
| 8 | Restaurateur logs out | Session terminated, refresh token invalidated | Logged out successfully | Pass |

**Table 11: Test Cases for System Testing — Admin of RestroVibes**

| S. N | Test Case | Expected Outcome | Actual Result | Remarks |
|------|-----------|------------------|---------------|---------|
| 1 | Admin logs in with valid credentials | Authenticated, redirected to admin dashboard | Admin logged in successfully | Pass |
| 2 | Admin views all users | User list returned with roles, status, reliability info | User list displayed | Pass |
| 3 | Admin backfills penalty scores for all clients | All client penalty_score, reliability_status, counters updated | Penalties recalculated | Pass |
| 4 | Admin views a specific user's risk profile | Penalty breakdown, booking history, reliability status returned | Risk profile displayed | Pass |
| 5 | Admin triggers manual lottery resolve | Contest resolved immediately, winners and losers updated | Lottery resolved | Pass |
| 6 | Admin logs out | Session terminated | Logged out successfully | Pass |

### 4.2.3 Failed Test Cases (Bugs Found During Testing)

The failures below were reproduced against the current codebase at `server/controllers/appointmentController.js`, `server/controllers/lotteryController.js`, `server/utils/weightedLottery.js`, and `server/utils/time.js`. Source references are noted in each test.

**Table 12: Failed Test Cases — Booking Validation of RestroVibes**

| S. No | Test Name | Input | Expected Output | Actual Output | Test Result |
|-------|-----------|-------|-----------------|---------------|-------------|
| 1 | Book with non-numeric / zero party size | party_size: "abc" or 0 | 400 "party_size must be a positive integer" | 200 — falsy value silently replaced with party_size 1 and appointment created (`appointmentController.js:328`: `Number(...) \|\| ... \|\| 1`) | Fail |
| 2 | Book on a future date when the restaurant is oversold that day | seat_capacity 10, tomorrow already at 8 seats, new request party_size 5 | 409 "Restaurant is fully booked" | 200 — capacity check sums only **today's** seats (`countActiveAppointments`, `appointmentController.js:128`), so future-day oversell goes undetected | Fail |
| 3 | Book with party size exceeding table capacity | Table C (capacity 4), party_size: 6 | 409 "Party size exceeds table capacity" | 200-booked or entered into pool — the per-table capacity check runs only when a `table_id` is supplied (`appointmentController.js:455`); contested bookings skip it entirely via the `else if (!isSlotContested)` guard at `:465` | Fail |

**Table 13: Failed Test Cases — Weighted Lottery of RestroVibes**

| S. No | Test Name | Input / DB State | Expected Output | Actual Output | Test Result |
|-------|-----------|------------------|-----------------|---------------|-------------|
| 1 | Draw with all entries at zero weight | Two entries with weight 0 / 0 in the pool | No winner selected, pool left pending | selectWeightedEntry() silently returns the **last entry** as the winner (`weightedLottery.js:38`, `if (totalWeight <= 0) return weightedEntries[weightedEntries.length - 1]`) | Fail |
| 2 | Enter lottery with invalid party size | POST /api/lottery/enter, party_size: -1, slot 10 | 400 validation error | 200 — `enterLottery` validates slot range but never party_size or capacity (`lotteryController.js:19-30`) | Fail |
| 3 | Draw with an entry whose effective weight is zero | Entries: A weight 100, B weight 0 — random lands past A's threshold | Only A eligible, B skipped | Threshold loop skips B but falls through to return the **last entry** (`weightedLottery.js:47`), which can be the zero-weight entry B | Fail |

**Table 14: Failed Test Cases — Lottery Resolution of RestroVibes**

| S. No | Test Name | Input | Expected Output | Actual Output | Test Result |
|-------|-----------|-------|-----------------|---------------|-------------|
| 1 | Resolve a slot when the client holds multiple pending appointments that day | Client has pending appointments at slot 30 and slot 45; resolve slot 30, client wins | Only the slot-30 appointment accepted | Winner matched by client/restaurant/date only, ordering by date DESC (`lotteryController.js:234`) — the latest appointment (slot 45) is "accepted" instead | Fail |
| 2 | Loser cancellation on a multi-slot day | Same as above, client loses slot 30 | Only slot-30 appointment cancelled | Loser appointment matched the same day-only way (`lotteryController.js:252`) — the wrong appointment can be cancelled | Fail |
| 3 | Resolve without transaction under concurrent manual + scheduler resolve | Two resolve calls target the same slot simultaneously | Exactly one winner, others lost | Winner selection and status updates are not transactional — both calls can draw different winners before the update commits | Fail |

**Table 15: Failed Test Cases — Time Formatting of RestroVibes**

| S. No | Test Name | Input | Expected Output | Actual Output | Test Result |
|-------|-----------|-------|-----------------|---------------|-------------|
| 1 | Format midnight time | time: "00:30" | "12:30 AM" | "0:30 AM" — hour 0 not remapped to 12 (`time.js:11`) | Fail |
| 2 | Format noon time | time: "12:15" | "12:15 PM" | "12:15 PM" | Pass |

### Result Analysis

The RestroVibes system is a restaurant booking platform that resolves contested time slots through a weighted lottery with time-decay aging. The system ensures fair allocation when multiple clients compete for the same fifteen-minute slot by scoring each entry on flexibility, loyalty, and penalty history, then rewarding patience through a capped aging boost.

**Key Features:**

- **Contested Slot Detection:** When a booking request lands on a slot with existing pending entries, the system validates service hours, the one-hour gap rule, and seat capacity before routing the request into the lottery pool rather than confirming it directly.

- **Base Weight Calculation:** Each pool entry receives a fixed base score from three normalized factors — flexibility (0.4–1.0), loyalty (blended from restaurant-specific, platform-wide, and account age sub-scores), and penalty (derived from four historical infraction rates with decay for good recent behavior) — computed once at entry and stored.

- **Time-Decay Aging:** An entry's effective weight grows from the moment it joins the pool, using a six-hour half-life curve capped at a 4× multiplier, allowing patient entrants to close weight gaps against fresher, higher-base-score rivals up to a 4:1 ratio.

- **Weighted Random Draw:** A 60-second scheduler resolves contested today- and tomorrow-dated slots; entries dated further out wait until their date enters that window so aging can accumulate. At draw time, every entry's effective weight is frozen and a winner is selected with probability proportional to that weight.

- **Resolution:** The winning entry's appointment is accepted; all losing entries are cancelled. Each winner receives its actual computed win probability. The initial estimated chance displayed at pool entry assumes an average competitor weight of 100 and is approximate.
