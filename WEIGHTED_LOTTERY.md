# Weighted Lottery System with Time Decay

## Overview

When multiple clients compete for the same time slot at the same restaurant, the RestroVibes system resolves the conflict fairly using a **weighted lottery**. Instead of a completely random draw, every competing entry is assigned a weight that reflects how valuable that client is to the restaurant, combined with a **time-decay boost** that gives a growing advantage to entries which have waited the longest.

The weight of an entry is the product of two independent components:

```
finalWeight = baseWeight(client factors) × agingBoost(time decay)
```

| Component | Source | Effect |
|---|---|---|
| baseWeight | Flexibility, loyalty, client reliability | Higher for flexible, loyal, reliable clients |
| agingBoost | Time spent waiting in the lottery pool | Higher for entries that entered earlier |

The base weight captures **who you are** as a client. The aging boost captures **how long you waited**. Neither can override the other entirely: the boost is proportional to the base weight, so a good client who waited stays ahead of a bad client who waited even longer.

## Factors of the Base Weight

The base weight combines three client signals, each normalized to the range [0, 1] and weighted by a fixed coefficient:

```
W = BASE + (flexibilityScore × α) + (loyaltyScore × β) − (clientReliabilityPenalty × γ)
```

with BASE = 100, α = 50, β = 30, and γ = 200. The result is clamped to a minimum of 1, so no entry ever receives a zero or negative base weight and every entry remains eligible for the draw.

The three coefficients are deliberate:

| Factor | Coefficient | Meaning |
|---|---|---|
| Flexibility | α = 50 | Modest reward for making scheduling easier |
| Loyalty | β = 30 | Small reward for repeat, consistent patronage |
| Reliability | γ = 200 | Dominant penalty — poor history is very costly |

### 1. Flexibility Score — weight α = 50

Flexibility rewards clients who are willing to accept a nearby time window, making it easier for the restaurant to place them. It is scored purely from the declared flexibility window:

```
score = 0.4 for window ≤ 30 min
       0.7 for window 31–60 min
       1.0 for window > 60 min
```

```
flexibility contribution = + (flexibilityScore × 50)
Example: flexibility 1.0 → +50 points
```

Every client starts with a base of 0.4, so even a rigid booking contributes 20 points. The score is captured once when the entry joins the pool and cached on the user record; the declared window is stored on the entry itself for the duration of the draw.

### 2. Client Reliability (Penalty Score) — weight γ = 200

Client reliability is the strongest single factor. Each client carries a penalty score p ∈ [0, 1] computed from their booking history (no-shows, late arrivals, late cancellations, and overstays), where:

```
rawPenalty      = (n_ns × 0.7 + n_la × 0.4 + n_lc × 0.3 + n_os × 0.15) / n_total
completionRatio = n_completed / n_total
decay           = min(completionRatio × 0.15, rawPenalty × 0.3)
penaltyScore    = clamp(0, 1, rawPenalty − decay)
```

A reliable client (p ≈ 0) does not reduce their weight, while a flagged client (p > 0.4) suffers a reduction of up to 80 points — making them far less likely to win a contested slot. This ensures that good clients are prioritized over clients who repeatedly damage restaurant business:

```
penalty contribution = − (penaltyScore × 200)
Example: penalty 0.4 → −80 points
```

### 3. Loyalty Score — weight β = 30

The loyalty score rewards clients who book repeatedly and stick to their appointments:

```
loyaltyScore = (restaurantSpecific × 0.5) + (platformWide × 0.3) + (accountAge × 0.2)
```

| Sub-score | Weight | Thresholds | Value |
|---|---|---|---|
| Restaurant-specific | 0.5 | ≥6 / ≥3 / ≥1 completed bookings | 1.0 / 0.6 / 0.3 |
| Platform-wide | 0.3 | ≥10 / ≥3 completed bookings | 1.0 / 0.5 |
| Account age | 0.2 | ≥365 / ≥181 / ≥31 days | 1.0 / 0.6 / 0.3 |

```
loyalty contribution = + (loyaltyScore × 30)
Example: loyalty 1.0 → +30 points
```

### Complete Base Weight Examples

For a flexible, reliable, loyal client (flexibility 1.0, penalty 0.0, loyalty 1.0):

```
W = 100 + (1.0 × 50) + (1.0 × 30) − (0.0 × 200) = 180
```

For a flagged client with minimal flexibility (flexibility 0.4, penalty 0.5, loyalty 0.0):

```
W = max(100 + (0.4 × 50) + (0 × 30) − (0.5 × 200), 1) = max(20, 1) = 20
```

## Time-Decay (Aging) Factor

The base weight alone would allow an early entry to be beaten instantly by a highly rated client who joins later. To keep the lottery fair, the base weight is multiplied by an exponential **aging factor** that grows with the time an entry has spent waiting in the pool:

```
aging(t) = 1 − 0.5^(t / h)
agingBoost = 1 + min(aging(t) × B_max, B_max)
finalWeight = W × agingBoost
```

where:

- **t** = the entry's age in hours, measured at the moment of the draw: `t = (drawTime − entered_at) / 3,600,000`
- **h = 6 hours** = the half-life. After 6 hours an entry has gained half of the possible boost.
- **B_max = 3** = the maximum boost. `min(...)` clamps it, so the effective weight approaches (but never exceeds) **4 × W**.

The growth is exponential and asymptotically capped — gains are fast at first, then flatten out:

| Waiting time | aging(t) | agingBoost | multiplier on W |
|---|---|---|---|
| 0 hours | 0.000 | 1.00 | × 1.00 |
| 1 hour | 0.109 | 1.33 | × 1.33 |
| 3 hours | 0.293 | 1.88 | × 1.88 |
| 6 hours | 0.500 | 2.50 | × 2.50 |
| 12 hours | 0.750 | 3.25 | × 3.25 |
| 24 hours | 0.938 | 3.81 | × 3.81 |
| 48 hours | ≈ 0.997 | ≈ 3.99 | × 3.99 |
| → ∞ | 1.000 | 4.00 | × 4.00 (asymptote) |

### Two Properties That Matter

**1. The boost is proportional to the base weight.** The multiplier applies to *your* W, so stronger clients scale higher:

```
reliable  client (W = 180) × 6h boost 2.5 → 450
flagged   client (W =  20) × 6h boost 2.5 →  50
```

Time decay therefore rewards patience **without ever overriding client quality** — a bad client cannot catch up no matter how long they wait.

**2. "Earlier = more points" is true but capped.** More precisely: the earlier you *enter the pool* (`entered_at`), the larger your boost, up to the ×4 asymptote. Beyond ~24 hours the added gain is negligible (24h → 3.81×, 48h → 3.99×), so very old entries behave identically. And because the boost is a multiplier on W, an early rank advantage only tilts contests between otherwise similar clients — it never lets a clearly worse client win.

### When the Boost Actually Applies (Resolution Timing)

The boost grows only while an entry sits **pending** in the pool; it is frozen at the instant the draw runs. When the draw happens determines how much boost is accumulated:

| Scenario | When the draw fires | Impact of decay |
|---|---|---|
| Contested slot dated **today / tomorrow** | ~1 minute after the second entrant joins (`lotteryScheduler`, polls every 60 s) | Boost ≈ the head-start of the earlier entrant; nil if entrants arrive back-to-back, meaningful if one sat alone for hours |
| Contested slot dated **future (2+ days out)** | Held until the booking date enters the today/tomorrow window | Entries can age for days → boost large, near the ×4 cap for everyone who entered well in advance |
| **Manual** resolution by the restaurateur | Whenever the restaurateur decides | Boost keeps growing while the slot is under review |

### Combined Example

An entry with base weight W = 100 that waited 6 hours in the pool receives:

```
aging(6) = 1 − 0.5^(6/6) = 0.5
agingBoost = 1 + min(0.5 × 3, 3) = 2.5
finalWeight = 100 × 2.5 = 250
```

## Winner Selection

All pending entries for the contested slot are grouped, their effective weights computed **at draw time**, and a winner is selected by weighted random sampling proportional to those weights:

```
total = Σ finalWeight_i
threshold = random × total          (random ∈ [0, 1))
for each entry:
    threshold = threshold − finalWeight_i
    if threshold ≤ 0 → winner
```

Each entry therefore wins with probability `finalWeight_i / total`. The winning chance is reported back to the client together with the competitor count, so the draw is transparent.

After selection:

- The winner's lottery entry is marked **won** and their appointment is set to **accepted**.
- Each loser's entry is marked **lost** and their appointment is set to **cancelled**.

The lottery runs alongside the manual accept/reject flow, so a restaurateur can still decide on a contested slot before the lottery closes it.

## Flow Diagram

```
START
  │
  ▼
Collect all pending entries for the contested slot
(restaurant + date + time slot)
  │
  ▼
For each entry, compute base weight:
W = 100 + (flexibility × 50) + (loyalty × 30) − (penalty × 200)   (min 1)
  │
  ▼
Measure age at draw time:
t = (now − entered_at) / 3,600,000  (hours)

Apply time-decay aging factor:
aging   = 1 − 0.5^(t / 6)
W_eff   = W × (1 + min(aging × 3, 3))
  │
  ▼
total = Σ W_eff
  │
  ▼
Select winner: threshold = random × total → weighted random walk
  │
  ├──────────────► Winner → status "won"   → appointment accepted
  │
  └──────────────► Losers → status "lost"  → appointments cancelled
  │
  ▼
Return winning chance and competitor count to UI
  │
  ▼
END
```

## Factors Summary

The weighted lottery considers exactly these factors when deciding a contested slot:

1. **Client flexibility** — positive factor (α = 50). Clients who accept a wider time window gain a modest advantage.
2. **Client reliability (penalty score)** — strongest negative factor (γ = 200). Reliable clients are strongly favored; flagged clients are unlikely to win.
3. **Client loyalty** — positive factor (β = 30). Loyal, repeat clients gain a small advantage.
4. **Time decay (aging)** — multiplicative boost (half-life 6 h, asymptote ×4). Entries that waited longer grow stronger, keeping the lottery fair for early joiners without ever overriding client quality.