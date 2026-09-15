# Test Cases — RestroVibes

## 4.2 Testing

### 4.2.1 Unit Testing

**Table 1: Test Case for User Registration of RestroVibes**

| S. No | Test Name | Input | Expected Output | Actual Output | Test Result |
|-------|-----------|-------|-----------------|---------------|-------------|
| 1 | Register with valid details | Email: aarav.adhikari147@gmail.com, Name: Aarav Adhikari, Password: Password@123, Phone: 9812345678 | Account created, JWT token returned | As expected | Pass |
| 2 | Register with duplicate email | Email: aarav.adhikari147@gmail.com (already exists) | 409 "Email already in use" error | As expected | Pass |
| 3 | Register with invalid phone format | Phone: 1234567890 (not 98/97 prefix) | 400 "Invalid phone number" error | As expected | Pass |
| 4 | Register with password shorter than 8 chars | Password: 123456 | 400 "Password must be at least 8 characters" error | As expected | Pass |
| 5 | Non-admin attempts to register as admin | Role: admin (from client user) | 403 "Only admins can assign this role" error | As expected | Pass |

**Table 2: Test Case for User Login of RestroVibes**

| S. No | Test Name | Input | Expected Output | Actual Output | Test Result |
|-------|-----------|-------|-----------------|---------------|-------------|
| 1 | Login with valid credentials | Email: aarav.adhikari147@gmail.com, Password: Password@123 | JWT token returned, user role in payload | As expected | Pass |
| 2 | Login with correct email and wrong password | Email: aarav.adhikari147@gmail.com, Password: WrongPass@1 | 401 "Invalid email or password" message | As expected | Pass |
| 3 | Login with unregistered email | Email: sunita.tamang999@gmail.com | 401 "Invalid email or password" message | As expected | Pass |

**Table 3: Test Case for Appointment Booking Validation of RestroVibes**

| S. No | Test Name | Input | Expected Output | Actual Output | Test Result |
|-------|-----------|-------|-----------------|---------------|-------------|
| 1 | Book with valid data, no existing contest | Restaurant: Rohan Shrestha (Thamel), Table 2 (capacity 4), party_size: 2, date: 2026-09-15T10:00, slot 40, hours 09:00–18:00 | Appointment created, status = accepted | As expected | Pass |
| 2 | Book outside restaurant service hours | Restaurant: Rohan Shrestha (Thamel), date: 2026-09-15T02:00 (opens 09:00) | 400 "Booking outside service hours" error | As expected | Pass |
| 3 | Book violating one-hour gap rule | Restaurant: Rohan Shrestha (Thamel), existing accepted appointment at 10:00, new request at 10:30 | 409 "Minimum one-hour gap required" error | As expected | Pass |
| 4 | Book exceeding restaurant seat capacity | Restaurant: Bouddha Bistro (Bouddha), active seats in use: 8, seat_capacity: 10, party_size: 3 | 409 "Seat capacity exceeded" error | As expected | Pass |
| 5 | Book with time slot index out of range | preferred_time_slot: 96 | 400 "Time slot must be between 0 and 95" error | As expected | Pass |
| 6 | Book with negative party size | party_size: -1 | 400 validation error | As expected | Pass |
| 7 | Book with non-numeric / zero party size | Restaurant: Rohan Shrestha (Thamel), party_size: "abc" or 0 | 400 "party_size must be a positive integer" error | Accepted with party_size 1 — See Note F1 | Fail |
| 8 | Book on a future date when the restaurant is oversold that day | Restaurant: Bouddha Bistro (Bouddha), seat_capacity 10, tomorrow already at 8 seats, new request party_size 5 | 409 "Restaurant is fully booked" error | Accepted, oversold — See Note F2 | Fail |
| 9 | Book with party size exceeding table capacity | Restaurant: Rohan Shrestha (Thamel), Table 1 (capacity 4), party_size: 6 | 409 "Party size exceeds table capacity" error | Accepted / pooled — See Note F3 | Fail |

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
| 1 | Second request on same slot enters lottery pool | Client Sunita Tamang already booked slot 34 (Restaurant: Rohan Shrestha — Thamel, date 2026-09-15, status = pending), client Aarav Adhikari requests same slot | Aarav's entry created in lottery_pool with status = pending, weight stored | As expected | Pass |
| 2 | First request on empty slot confirmed directly | No pending entries exist at slot 34 for Restaurant: Rohan Shrestha (Thamel) on 2026-09-15 | Appointment status = accepted, no lottery_pool entry created | As expected | Pass |
| 3 | Enter lottery with invalid party size | POST /api/lottery/enter (Aarav Adhikari), party_size: -1, slot 10 | 400 validation error | 200, entry created — See Note F4 | Fail |

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
| 1 | Aged entry overtakes fresh higher-weight rival | B (Sunita Tamang): base 98.13, 24h aged (eff ≈ 374.1) vs A (Aarav Adhikari): base 165, fresh (eff = 165), injected random = 0.42 | P(B) ≈ 69%, P(A) ≈ 31% — B selected as winner | As expected | Pass |
| 2 | Inferior entry cannot overtake below quarter rule | X: base 30, max boost ×4 = 120 vs Y: base 140, boost ×1 = 140 | X never exceeds Y at any aging level; X cannot win | As expected | Pass |
| 3 | Two equal fresh entries — fair coin flip | A: base 120, fresh; B: base 120, fresh | P(A) = P(B) = 50% | As expected | Pass |
| 4 | Draw with all entries at zero weight | Two entries with weight 0 / 0 in the pool | No winner selected, pool left pending | Last entry returned as winner — See Note F5 | Fail |
| 5 | Draw with a zero-weight entry in the pool | Entries: A weight 100, B weight 0 — random lands past A's threshold | Only A eligible, B skipped | Zero-weight entry can win — See Note F6 | Fail |

**Table 8: Test Case for Resolution & Appointment Lifecycle of RestroVibes**

| S. No | Test Name | Input | Expected Output | Actual Output | Test Result |
|-------|-----------|-------|-----------------|---------------|-------------|
| 1 | Winner confirmed on lottery resolve | Entry of Sunita Tamang wins draw at slot 34, Restaurant: Rohan Shrestha (Thamel) | lottery_pool.status = won, appointment.status = accepted, winnerChance returned to client | As expected | Pass |
| 2 | Loser cancelled on lottery resolve | Entry of Aarav Adhikari loses draw at slot 34, Restaurant: Rohan Shrestha (Thamel) | lottery_pool.status = lost, appointment.status = cancelled | As expected | Pass |
| 3 | Mark arrival on time | actual_arrival_time within 15 min of appointment date | is_late = false, appointment updated | As expected | Pass |
| 4 | Mark arrival late | actual_arrival_time > 15 min after appointment date | is_late = true, appointment updated | As expected | Pass |
| 5 | No-show triggers penalty recalculation | Restaurateur marks no-show, client has 3 total bookings, 1 no-show | penalty_score recalculated via recalculateUserPenalty(), reliability_status updated | As expected | Pass |
| 6 | Cancel appointment without providing reason | PUT /api/appointments/:id/cancel with cancellation_reason blank | 400 "Cancellation reason is required" error | As expected | Pass |
| 7 | Manual lottery resolve without admin role | POST /api/lottery/resolve (role = client) | 403 Unauthorized | As expected | Pass |
| 8 | Resolve a slot when the client holds multiple pending appointments that day | Sunita Tamang has pending appointments at slot 30 and slot 45 (same restaurant, Thamel); resolve slot 30, Sunita wins | Only the slot-30 appointment accepted | Wrong appointment accepted — See Note F7 | Fail |
| 9 | Loser cancellation on a multi-slot day | Aarav Adhikari loses slot 30 but also holds a pending slot 45 appointment (same restaurant) | Only the slot-30 appointment cancelled | Wrong appointment cancelled — See Note F8 | Fail |
| 10 | Resolve without transaction under concurrent manual + scheduler resolve | Two resolve calls target the same slot simultaneously | Exactly one winner, others lost | Dual winners possible — See Note F9 | Fail |

**Notes (failed cases):**

- **Note F1:** Falsy `party_size` (`"abc"`, `0`) is treated as missing and silently replaced with `1` via `Number(...) || ... || 1` — `server/controllers/appointmentController.js:328`.
- **Note F2:** The seat-capacity check sums only **today's** active seats (`countActiveAppointments`, `server/controllers/appointmentController.js:128`), so a future-dated booking can oversell the restaurant.
- **Note F3:** The per-table capacity check runs only when a `table_id` is supplied (`appointmentController.js:455`); contested bookings skip it entirely via the `else if (!isSlotContested)` guard at `:465`.
- **Note F4:** `enterLottery` validates the slot range but never `party_size` or capacity — `server/controllers/lotteryController.js:19-30`.
- **Note F5:** With total weight ≤ 0, `selectWeightedEntry()` returns the **last entry** unconditionally (`if (totalWeight <= 0) return weightedEntries[weightedEntries.length - 1]`) — `server/utils/weightedLottery.js:38`.
- **Note F6:** When the random threshold passes all eligible entries, the loop falls through and returns the **last entry** (`weightedLottery.js:47`), which can be a zero-weight entry.
- **Note F7:** The winner's appointment is matched by client/restaurant/date only, ordered by date DESC — the latest appointment (e.g. slot 45) is accepted instead of the resolved slot — `server/controllers/lotteryController.js:234`.
- **Note F8:** Loser appointments are matched the same day-only way — the wrong pending appointment can be cancelled — `server/controllers/lotteryController.js:252`.
- **Note F9:** Winner selection and status updates are not wrapped in a transaction, so a concurrent scheduler + manual resolve can draw two different winners.

### 4.2.2 System Testing

**Table 9: Test Cases for System Testing — User (Client) of RestroVibes**

| S. N | Test Case | Expected Outcome | Actual Result | Remarks |
|------|-----------|------------------|---------------|---------|
| 1 | Client (Aarav Adhikari) registers with valid details | Account created, JWT returned | As expected | Pass |
| 2 | Client logs in with valid credentials | Authenticated, redirected to dashboard | As expected | Pass |
| 3 | Client browses available restaurant services | Services displayed with price, duration, availability | As expected | Pass |
| 4 | Client books a service with valid data, no contest | Appointment created, status = accepted | As expected | Pass |
| 5 | Client views appointment history | Previous and current appointments displayed | As expected | Pass |
| 6 | Client requests time extension on active appointment | Extension request created, extension_status = pending | As expected | Pass |

**Table 10: Test Cases for System Testing — Restaurateur of RestroVibes**

| S. N | Test Case | Expected Outcome | Actual Result | Remarks |
|------|-----------|------------------|---------------|---------|
| 1 | Restaurateur (Rohan Shrestha, Thamel) logs in with valid credentials | Authenticated, redirected to dashboard | As expected | Pass |
| 2 | Restaurateur creates a service with valid data | Service added to catalogue, price and duration saved | As expected | Pass |
| 3 | Restaurateur confirms a pending appointment for verified client | Appointment status = accepted, confirmed_at set | As expected | Pass |
| 4 | Restaurateur confirms appointment for unverified client | 403 CustomerNotVerifiedError | As expected | Pass |
| 5 | Restaurateur marks client arrival | actual_arrival_time recorded, is_late flag set if applicable | As expected | Pass |
| 6 | Restaurateur marks no-show on missed appointment | Appointment status = no_show, penalty_score recalculated | As expected | Pass |
| 7 | Restaurateur manually resolves a contested slot | lottery_pool entries resolved, winner = won/accepted, losers = lost/cancelled | As expected | Pass |
| 8 | Restaurateur logs out | Session terminated, refresh token invalidated | As expected | Pass |

**Table 11: Test Cases for System Testing — Admin of RestroVibes**

| S. N | Test Case | Expected Outcome | Actual Result | Remarks |
|------|-----------|------------------|---------------|---------|
| 1 | Admin (admin@gmail.com) logs in with valid credentials | Authenticated, redirected to admin dashboard | As expected | Pass |
| 2 | Admin views all users | User list returned with roles, status, reliability info | As expected | Pass |
| 3 | Admin backfills penalty scores for all clients | All client penalty_score, reliability_status, counters updated | As expected | Pass |
| 4 | Admin views a specific user's risk profile | Penalty breakdown, booking history, reliability status returned | As expected | Pass |
| 5 | Admin triggers manual lottery resolve | Contest resolved immediately, winners and losers updated | As expected | Pass |
| 6 | Admin logs out | Session terminated | As expected | Pass |

### Result Analysis

All static values in the tables above are taken from the RestroVibes seed data and location utilities. Test clients (e.g. Aarav Adhikari — `aarav.adhikari147@gmail.com`, Sunita Tamang) and restaurateurs (e.g. Rohan Shrestha at Thamel) follow the naming and email pattern produced by `server/seeders/locationBasedUserSeeder.js` with the default seeder password `Password@123`; the admin account matches `server/seedAdmin.js` (`admin@gmail.com`, `superadmin`). Restaurants reference real Kathmandu neighborhoods (Thamel, Bouddha, Patan, Lazimpat, Pulchowk) from `server/utils/location.js`. The password-length expectation reflects the actual `min: 8` rule in `server/utils/validation.js`.

The RestroVibes system is a restaurant booking platform that resolves contested time slots through a weighted lottery with time-decay aging. The system ensures fair allocation when multiple clients compete for the same fifteen-minute slot by scoring each entry on flexibility, loyalty, and penalty history, then rewarding patience through a capped aging boost.

**Key Features:**

- **Contested Slot Detection:** When a booking request lands on a slot with existing pending entries, the system validates service hours, the one-hour gap rule, and seat capacity before routing the request into the lottery pool rather than confirming it directly.

- **Base Weight Calculation:** Each pool entry receives a fixed base score from three normalized factors — flexibility (0.4–1.0), loyalty (blended from restaurant-specific, platform-wide, and account age sub-scores), and penalty (derived from four historical infraction rates with decay for good recent behavior) — computed once at entry and stored.

- **Time-Decay Aging:** An entry's effective weight grows from the moment it joins the pool, using a six-hour half-life curve capped at a 4× multiplier, allowing patient entrants to close weight gaps against fresher, higher-base-score rivals up to a 4:1 ratio.

- **Weighted Random Draw:** A 60-second scheduler resolves contested today- and tomorrow-dated slots; entries dated further out wait until their date enters that window so aging can accumulate. At draw time, every entry's effective weight is frozen and a winner is selected with probability proportional to that weight.

- **Resolution:** The winning entry's appointment is accepted; all losing entries are cancelled. Each winner receives its actual computed win probability. The initial estimated chance displayed at pool entry assumes an average competitor weight of 100 and is approximate.
