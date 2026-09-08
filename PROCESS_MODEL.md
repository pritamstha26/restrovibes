# RestroVibes — UML Process Model

Plain-language UML 2.5 activity and state-machine models of how the platform
works: booking a table, the draw for busy slots, what happens during and after a
visit, cancellations, and how the platform keeps a trust score for each
customer. The models describe *what happens*, not *how the code is written*.

## Notation Key

| UML node | Notation | Meaning |
|---|---|---|
| Initial node | filled circle | where a process begins |
| Activity | rounded rectangle | a step or action |
| Decision / merge | diamond | a fork in the road (with guards) or joining of two paths |
| Guard | `[condition]` on an arrow | the question that decides which path to take |
| Final node | circle-in-circle | end of a process |
| Loop | backward arrow | the process repeats |
| State | rounded rectangle (state machine) | where a booking currently stands |
| Transition | `what triggers it / what it does` | how a booking moves from one state to another |

The boxes also say who is acting: `Customer`, `Restaurant`, `System`.

---

## 1. UML Activity Diagram — Booking a Table

```mermaid
flowchart TD
    START(( )):::start --> R1([Customer asks to book a table and time])
    R1 --> R2([System checks who is asking])
    R2 --> R3([System checks the details: date, time, party size and restaurant])
    R3 --> R4([System checks the date is in the future and the restaurant is open])
    R4 --> R5([System checks the party size fits the notice hours])
    R5 --> R6([System looks at the chosen slot and who else has asked for it])
    R6 --> D1{Is the slot crowded?}

    D1 --|[yes]|--> D3{Is there enough time since the customer's last visit to this restaurant?}
    D3 --|[no]|--> E1([System declines - the customer must leave an hour between visits]) --> FJ((•)):::final
    D3 --|[yes]|--> A1([System scores the customer's reliability, loyalty and flexibility])
    A1 --> A2([System adds the customer to the draw for this slot])
    A2 --> A3([System saves a waiting booking and tells the customer to await the draw])
    A3 --> FL((•)):::final

    D1 --|[no]|--> D2{Did the customer ask for a specific table?}
    D2 --|[yes]|--> D4{Does the party fit that table and is it free in this slot?}
    D4 --|[no]|--> E2([System declines - that table cannot take this booking]) --> FN1((•)):::final
    D4 --|[yes]|--> M1{ }
    D2 --|[no]|--> D5{Is there free seating in the restaurant for this slot?}
    D5 --|[no]|--> E3([System declines - the restaurant is full]) --> FN2((•)):::final
    D5 --|[yes]|--> M1
    M1 --> D3B{Is there enough time since the customer's last visit to this restaurant?}
    D3B --|[no]|--> E4([System declines - the customer must leave an hour between visits]) --> FN3((•)):::final
    D3B --|[yes]|--> A4([System confirms the booking right away])
    A4 --> FA((•)):::final

    classDef start fill:#000,stroke:#000,color:#fff;
    classDef final fill:#fff,stroke:#000,stroke-width:2px;
```

- A slot is *crowded* when another booking or draw request already covers it,
  so more than one customer is competing for the same table and time.
- When the slot is crowded, the system puts the customer into the draw
  automatically. When it is free, the booking is confirmed immediately.

---

## 2. UML Activity Diagram — The Draw for a Busy Slot

```mermaid
flowchart TD
    START(( )):::start --> EN([Customer asks for a busy slot])
    EN --> ENW([System scores the customer's reliability, loyalty and flexibility])
    ENW --> ENA([System creates a draw ticket for the slot])
    ENA --> ENR([System tells the customer they are in the draw and how good their chance is])
    ENR --> ENF((•)):::final

    TICK([System runs the draw for crowded slots, every minute])
    TICK --> Q1([System lists slots with at least two customers waiting])
    Q1 --> D1{Any slot to decide now?}
    D1 --|[no]|--> EXP([System closes stale tickets whose date has passed])
    EXP --> TF((•)):::final
    D1 --|[yes]|--> LD([System gathers the tickets for a slot])
    LD --> AW([System gives each ticket a chance: reliable, loyal and early customers do better])
    AW --> SD([System draws one winning ticket at random, using those chances])
    SD --> MR([System marks the winner, and the rest as not chosen])
    MR --> WA([System confirms the winner's booking])
    WA --> LC([System lets go of the bookings that were not chosen])
    LC --> LG([System notes the outcome and moves to the next slot])
    LG --> D1

    classDef start fill:#000,stroke:#000,color:#fff;
    classDef final fill:#fff,stroke:#000,stroke-width:2px;
```

**What makes a customer's chance better**

| Factor | Effect |
|---|---|
| Everyone starts equal | base score of 100 |
| Flexible about time, date or party size | higher score (+up to 50) |
| Regular, loyal customer | higher score (+up to 30) |
| History of missed, late or cancelled visits | lower score (up to -200) |
| Asked earlier than others | small extra advantage |
| Lowest possible score | chance never falls below 1 |

---

## 3. UML Activity Diagram — During and After the Visit

### 3.1 The Customer Arrives

```mermaid
flowchart TD
    START(( )):::start --> REQ([Restaurant records the customer's arrival])
    REQ --> AUTH{Is this the restaurant holding the booking?}
    AUTH --|[no]|--> E1([System declines - not allowed]) --> F1((•)):::final
    AUTH --|[yes]|--> ST{Is the booking confirmed or still waiting?}
    ST --|[no]|--> E2([System declines - the visit is already underway or over]) --> F2((•)):::final
    ST --|[yes]|--> ONC{Has the arrival already been recorded?}
    ONC --|[no]|--> E3([System declines - arrival already recorded]) --> F3((•)):::final
    ONC --|[yes]|--> CHK{Did the customer arrive more than 15 minutes late?}
    CHK --|[yes]|--> LAT([System records the arrival and notes the customer as late])
    LAT --> HL([System keeps a note of the late arrival])
    HL --> PEN([System updates the customer's trust score])
    PEN --> FL((•)):::final
    CHK --|[no]|--> ONT([System records the arrival on time])
    ONT --> FO((•)):::final

    classDef start fill:#000,stroke:#000,color:#fff;
    classDef final fill:#fff,stroke:#000,stroke-width:2px;
```

### 3.2 The Customer Does Not Arrive (No-Show)

```mermaid
flowchart TD
    START(( )):::start --> REQ([Restaurant reports the customer did not arrive])
    REQ --> AUTH{Is this the restaurant holding the booking?}
    AUTH --|[no]|--> E1([System declines - not allowed]) --> F1((•)):::final
    AUTH --|[yes]|--> ST{Is the booking waiting, confirmed or in progress?}
    ST --|[no]|--> E2([System declines - it is too late to mark a no-show]) --> F2((•)):::final
    ST --|[yes]|--> SET([System marks the booking as a no-show])
    SET --> HIST([System keeps a note of the missed visit])
    HIST --> PEN([System updates the customer's trust score])
    PEN --> F3((•)):::final

    classDef start fill:#000,stroke:#000,color:#fff;
    classDef final fill:#fff,stroke:#000,stroke-width:2px;
```

### 3.3 The Customer Stays Longer

```mermaid
flowchart TD
    START(( )):::start --> REQ([Customer asks to stay longer])
    REQ --> AUTH{Is the customer the one who made the booking?}
    AUTH --|[no]|--> E1([System declines - not allowed]) --> F1((•)):::final
    AUTH --|[yes]|--> ST{Is the booking waiting, confirmed or in progress?}
    ST --|[no]|--> E2([System declines - this booking cannot be extended]) --> F2((•)):::final
    ST --|[yes]|--> CAP{Can the restaurant still fit the longer stay?}
    CAP --|[no]|--> E3([System declines - no room for a longer stay]) --> F3((•)):::final
    CAP --|[yes]|--> EXT([System moves the end time later and confirms the extra time])
    EXT --> F4((•)):::final

    classDef start fill:#000,stroke:#000,color:#fff;
    classDef final fill:#fff,stroke:#000,stroke-width:2px;
```

### 3.4 The Visit Runs Past Its Time

The system keeps watch in the background. It has no end point by design: each
check finishes, then the next one starts a minute later.

```mermaid
flowchart TD
    TICK([System watches visits that should already have ended, every minute])
    TICK --> SCAN([System lists visits that are still open but past their end time])
    SCAN --> NEXT{Has a visit been running past its time plus a short grace period?}
    NEXT --|[no]|--> TICK
    NEXT --|[yes]|--> IP{Did the customer arrive?}
    IP --|[yes]|--> C1([System finishes the visit])
    C1 --> H1([System notes the visit ran over its time])
    H1 --> P1([System updates the customer's trust score])
    P1 --> TICK
    IP --|[no]|--> C2([System marks the visit as a no-show])
    C2 --> H2([System notes the missed visit])
    H2 --> P2([System updates the customer's trust score])
    P2 --> TICK

    classDef start fill:#000,stroke:#000,color:#fff;
```

> A restaurant can also finish a visit by hand at any time. In addition, a
> background job confirms the single waiting booking for a free slot after a
> short wait, while crowded slots are always handed to the draw.

---

## 4. UML Activity Diagram — Cancelling a Booking

```mermaid
flowchart TD
    START(( )):::start --> REQ([The customer, the restaurant or an administrator cancels the booking])
    REQ --> AUTH{Is the caller allowed to cancel this booking?}
    AUTH --|[no]|--> E1([System declines - not allowed]) --> F1((•)):::final
    AUTH --|[yes]|--> SET([System cancels the booking])
    SET --> HIST([System keeps a note of the late cancellation])
    HIST --> QUEUE([System tidies the restaurant's waiting list])
    QUEUE --> F2((•)):::final

    classDef start fill:#000,stroke:#000,color:#fff;
    classDef final fill:#fff,stroke:#000,stroke-width:2px;
```

---

## 5. UML Activity Diagram — Keeping a Customer's Trust Score

Every visit that finishes, is missed, is late or is cancelled is noted. The
system turns those notes into a simple trust score for the customer.

```mermaid
flowchart TD
    START(( )):::start --> EV([An event is noted: finished, missed, late, cancelled or overdue])
    EV --> CNT([System counts how many of each event the customer has])
    CNT --> RAW([System works out a penalty: missed and late events count the most])
    RAW --> DECAY([System eases the penalty for customers who usually do turn up])
    DECAY --> CLAMP([System keeps the penalty between zero and one])
    CLAMP --> RANGE{How high is the penalty?}
    RANGE --|[p] above 0.4|--> FLAG([System marks the customer as high-risk])
    RANGE --|0.15 to 0.4|--> RISK([System marks the customer as at-risk])
    RANGE --|0.15 or less|--> REL([System keeps the customer in good standing])
    FLAG --> CACHE([System stores the updated trust profile])
    RISK --> CACHE
    REL --> CACHE
    CACHE --> FIN((•)):::final

    classDef start fill:#000,stroke:#000,color:#fff;
    classDef final fill:#fff,stroke:#000,stroke-width:2px;
```

| What happened | Cost to the trust score |
|---|---|
| Customer never arrived | 0.70 |
| Customer arrived late | 0.40 |
| Customer cancelled late | 0.30 |
| Customer overstayed | 0.15 |
| Customer usually shows up | the penalty is softened |

---

## 6. UML State Machine Diagram — What Happens to a Booking

This diagram shows the stages a booking moves through, and what moves it from
one stage to the next. It is written for non-technical readers, so everyday
words are used instead of internal names.

```mermaid
stateDiagram-v2
    state "Booked, waiting for confirmation" as Pending
    state "Booking confirmed" as Accepted
    state "Visit underway" as InProgress
    state "Visit finished" as Completed
    state "Booking cancelled" as Cancelled
    state "Customer did not arrive" as NoShow

    [*] --> Pending : the customer makes a booking
    Pending --> Accepted : slot is free, the draw picks this customer, or the restaurant confirms
    Pending --> Cancelled : the booking is cancelled
    Pending --> NoShow : the customer does not arrive within the allowed time
    Accepted --> InProgress : the customer arrives and the visit begins
    Accepted --> Cancelled : the booking is cancelled
    Accepted --> NoShow : the customer does not arrive within the allowed time
    InProgress --> Completed : the visit ends as planned, or runs past its time and is closed
    InProgress --> NoShow : the restaurant reports nobody arrived
    Completed --> [*] : the booking is closed
    Cancelled --> [*] : the booking is closed
    NoShow --> [*] : the booking is closed

    note right of Pending
        crowded slot: the booking waits
        for the draw and may be confirmed
        later, or may be cancelled
        free slot: confirmed straight away
    end note
```

---

## 7. UML State Machine Diagram — A Customer's Ticket in the Draw

```mermaid
stateDiagram-v2
    state "In the draw" as Ticket
    state "Won - booking confirmed" as Winner
    state "Lost - slot went to someone else" as Loser
    state "Lapsed - the date passed" as Expired

    [*] --> Ticket : the customer asks for a busy slot
    Ticket --> Winner : the draw picks this customer
    Ticket --> Loser : the draw picks another customer
    Ticket --> Expired : the booking date passes with no decision
    Winner --> [*] : the booking is confirmed
    Loser --> [*] : no booking is made
    Expired --> [*] : the booking is cancelled

    note right of Ticket
        tickets stay in the draw until
        the draw is held or the date
        of the slot passes
    end note
```

---

## 8. Process & Trigger Summary

| Process | When it happens | Outcome |
|---|---|---|
| Booking a table | The customer books a table and time | Confirmed, or waits for the draw |
| Joining the draw | The customer asks for a busy slot | A ticket is placed in the draw |
| Holding the draw | Automatically, every minute | One winner, everyone else released |
| Auto-confirming a free slot | Automatically, after a short wait | Waiting booking confirmed |
| Recording arrival | The restaurant notes the customer arrived | Visit starts; late arrivals are noted |
| Reporting a no-show | The restaurant reports the customer never arrived | Customer marked as a no-show |
| Extending a stay | The customer asks to stay longer | End time moved later |
| Closing late visits | Automatically, every minute | Overdue visits finished or marked as no-shows |
| Finishing a visit | The restaurant marks the visit as over | Visit finished |
| Cancelling | The customer, restaurant or admin cancels | Booking cancelled |
| Refreshing trust | After every finished, missed or cancelled visit | Customer's trust profile updated |