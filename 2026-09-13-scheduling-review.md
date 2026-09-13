# Scheduler review, 13 September 2026

Reviewed as a scheduling and transport manager would use it on a Monday morning: what can I plan, what will bite me on the day, and what would I have to keep in my head or on paper because the tool does not hold it.

What is already solid: operatives and time per job, the 7h 45m day and weekly recycling remainder, production standards and Plan it, item-based van loads with the guardrail, vehicle advice up to 26t with the city cap, driver rules, rounds and Combine Trips, date holds as ghost cards, the To plan filter, and the two PDFs.

## Gaps ranked by how much they would hurt

### 1. No time of day
Everything is a whole day. A delivery booked "any time 8 to 4:30" is fine, but customers give slots: "not before 10, loading bay closes at 3, goods lift booked 1 to 2". The round order, the travel time and the day total all assume the van leaves at 8 and nothing is timed. Two jobs can both say "must be done by 10am" and the tool sees no clash.
Fix: an optional earliest arrival and latest finish on a transport job, shown on the card and used by the round order and the day warnings.

### 2. Driving time is not a working-time check
Return travel plus site time is added to the operative's day, but the driver's day is different from the van buddy's. A 4h return drive plus 4h on site is 8h, over the day, and the tool only flags it as over the 7h 45m total. It says nothing about a 12-hour day starting at 6, or a driver doing 5 long days in a row. Domestic drivers' hours rules for vans still cap a working day, and the Lutons at 3.5t fall under GB domestic rules (10 hours driving, 11 hours duty).
Fix: warn when driving time in a day is over 4h 30m without a break, and when a driver's day runs past 11 hours from a stated start time. Needs gap 1 first.

### 3. The van is not booked
Vehicle advice says what class the day needs, and the fleet strip says which Lutons are on the road, but no job is ever attached to a vehicle. Two drivers can both be planned out on the same day with only one van on the road and the tool will not say so. The routes view counts van trips against vans, but a day view or card does not.
Fix: assign a vehicle to a transport job or a round (FX75, FX73, hire, contractor's own). Warn when more rounds than vans on a day. Show vehicle on the card, the day view and both PDFs.

### 4. Hire and contractor lead time
When a day needs a 7.5t or 18t the advice says "hire with a driver", but nobody is reminded to book it, and there is no record it was booked. Same for a subcontractor. The day arrives and the truck was never ordered.
Fix: a "Vehicle booked" tick with supplier and reference on the job, and a warning on the week view when a hire is needed within 5 working days and is not ticked. Same tick for a subcontractor leg.

### 5. Production readiness vs delivery
A delivery can be planned for Tuesday while production is unassigned, late, or not QC'd. Production due is shown, and "late" is flagged, but the transport card is not blocked or warned when the workshop has not finished. Not QC'd shows as a badge only.
Fix: on the transport card and in the To plan count, a "Not ready" warning when the job is in a workshop list before Ready, or production days end after the day before delivery, or QC is not done. Sort those to the top of To plan.

### 6. Access and site facts are buried
The card back shows Access from the description, but the round, the routes view and the PDFs never repeat it. On the day the driver needs: parking suspension applied for, tail lift or ramp needed, lift dimensions, floor, out of hours, site contact number, waste transfer note needed. The routes PDF is the sheet the driver takes and it has none of it.
Fix: pull the Access and Contact lines onto the routes PDF stop rows and the day view card. Add three ticks per transport job: parking sorted, tail lift needed, waste transfer note printed. City access warnings should also say what to book, not just charge.

### 7. Weight is checked on the van, not on the people
Two-person items are known in the load table but the crew check only compares against the standard crew. A one-operative collection of 30 desks and 40 chairs will pass if the time is right. A 200 kg item with one person on the van is a manual handling failure.
Fix: if the load has any two-person item, require two operatives on the job. Flag any single item over 25 kg for a one-person crew.

### 8. Round order ignores what is on the van
Stops are nearest-neighbour from the yard. A collection before a delivery means the collected stock is in the way of the delivery items, and a clearance load with a delivery afterwards can exceed the van at the midpoint. The round load is summed for the day, not tracked stop by stop.
Fix: order deliveries before collections unless told otherwise, and show the load on board after each stop. Warn if it exceeds the van at any point.

### 9. Leave is only read from one list
Annual leave comes from the Holidays / Leave list. Sickness on the morning, a driver's licence points, a van breakdown, a training day: none of these have a place. The fix on the day is to move cards by hand and the tool only tells you someone is over after the fact.
Fix: a same-day "off today" toggle per operative in the day view, plus a bank holiday calendar so a Monday bank holiday does not show five working days.

### 10. Nothing tells you the plan changed
Sales can move a due date on the Trello card after operations planned it. The plan stays on the old day (it is keyed to the card and follows the due date, which is good), but the round it was in, the travel time and the vehicle may no longer make sense and nobody is told.
Fix: keep the planned date in the saved plan and warn on the card when the card's due date no longer matches it: "Planned for Tue 15, card now says Thu 17. Replan."

### 11. No what-happened record
Once the day is done there is no place for actual times, actual crew, or a job that did not happen. The manager view compares allocated to standard, never to actual. The PDF is a fill-in form but nothing takes the filled-in numbers back.
Fix: a small "Done" block per job: actual time, who went, one line of notes, plus a "Did not go" reason (customer not ready, van fault, weather). This feeds the standard over time and gives the fortnight reviews something real.

### 12. The week is planned in isolation from the next
Combine Trips looks ahead for nearby jobs, but capacity does not. Friday is full and Monday is empty and the view does not suggest moving a flexible job. Holds add "over if holds land" but there is no "under" signal.
Fix: a simple week summary at the top: hours planned against hours available, vans out against vans on the road, and a nudge when one day is over and a neighbour is empty.

### 13. Smaller things
- Contractor jobs with our operative attending: done 13 Sep 2026. Choose a contractor and put an operative on: they attend, their time is time on site, the load stays on the contractor vehicle, no two-person rule, a van only if they go in ours.
- Site visits and surveys use the same card as a delivery. Dropped: operatives do not use their own cars for work (insurance), so a site visit goes in a company vehicle and counts against the vans, which is what the Scheduler does.
- Customer collects still needs a loading slot and someone in the yard. It shows in transport; it should show in yard operations with a time, so the yard is not empty when the customer turns up.
- Multi-day transport jobs: done 13 Sep 2026, the load is shared equally across the days (a two-day 20 m³ clearance is 10 m³ a day), everywhere a day is added up.
- Travel time is straight line times 1.25 plus 20 percent. Fine for planning, wrong for the Lake District and central Manchester. A postcode-pair cache of real drive times from one lookup would fix most of it.
- The Manager PIN is client-side. Fine for keeping £ off the yard screen, not a control.

## Done
- 13 Sep 2026: gaps 1 and 2 built. Time windows (arrive after, finish by) on transport jobs, day walked from 8:00, cut-off misses and waits flagged, driver break over 4h 30m driving and day over 11 hours flagged.

- 13 Sep 2026: gaps 3 and 4 built. Vehicle on every transport job (FX75, FX73 or Hire), van chip on the card, double-booked van and off-road van warnings, drivers out against vans on the road, hire supplier and reference with a Booked tick that nags from five working days out, vehicle on the routes view and both PDFs, no van counts as To plan.

- 13 Sep 2026: gap 5 built. A delivery whose production is not scheduled, has no operatives, ends on or after delivery day or after its due date, or is not QC'd, is Not ready: it counts in To plan, the reason replaces the production due line on the card in red, and within two working days it is a red warning in the rail.

- 13 Sep 2026: gaps 6, 7 and 8 built. Contact and access under each stop on the routes sheet; loading sheet per van with deliveries in reverse loading order, collections after, and the load on board after every stop; deliveries before collections in the stop order; two-person items (or anything over 25 kg) with one operative count in To plan, badge the card, warn in the rail and on the card back.

- 13 Sep 2026: gap 9 built. Off today per operative in the day view with a reason, saved on the board; bank holidays for England and Wales built in through 2027; both flow into hours, capacity, crew picking and the rail.

- 13 Sep 2026: gap 10 built. The saved plan carries the date it was made for; a card moved by sales shows Date moved, stays Outstanding and warns in the rail until Replanned is pressed on the card back.

- 13 Sep 2026: gap 11 built. What happened block after the day: Done with actual time, travel, who went and notes, or Did not go with a reason; to record in the rail; did not go stays red until the card has a new date; Manager view shows actual against standard.

- 13 Sep 2026: gap 12 built. A day over its operative hours or short of vans gets an amber Heavy day note in the rail naming the lighter days this week and next and the jobs with no fixed window that could move. All twelve gaps from this review are now built.

## Suggested order
1. Time windows on transport jobs (gap 1), then the driver day check (gap 2).
2. Vehicle on the job and rounds vs vans (gap 3), then hire booked tick (gap 4).
3. Not ready warnings into To plan (gap 5).
4. Access and contact onto the routes PDF and day cards (gap 6).
5. Two-person items force two operatives (gap 7).
6. The rest as they bite.
