# Til Loan Day: fact-check

- **Loan day — needs rewording.** Use 11 January 2027 as an editable NTU planning estimate, not a promised payment date.
- **Holding deposit — correct.** In England the cap still applies to covered student lets: one week's rent per tenancy, not per tenant.
- **Arranged overdraft — correct.** The labels are fair if “used up” means no borrowing left within the agreed limit.
- **Meal deals — needs rewording.** Use £4 as a rough conversion; £3.85 is Tesco's Clubcard price, not a general price.
- **Fair-division credits — needs rewording.** Keep the credits, cite Spliddit's maximin method, and replace the competitor claim with what Dibs does.

Checked on 20 November 2026. The checkout at the time of review showed the Dibs credits and meal-deal conversion; the other Runway/Dibs wording below is assessed as supplied in the task.

## 1. January Maintenance Loan payment and NTU Term Two

**Verdict: needs rewording.** For an autumn-start full-time undergraduate receiving Student Finance England (SFE) funding, the second Maintenance Loan instalment is normally paid at the start of the course's second term, generally in January. Providers enter term dates based on when their students are in study. There is no single national January payment day, and a published term date is not confirmation of an individual payment.

- [GOV.UK, student loans terms and conditions for 2026/27](https://www.gov.uk/government/publications/student-loans-a-guide-to-terms-and-conditions/student-loans-a-guide-to-terms-and-conditions-2026-to-2027): “Maintenance Loans are paid directly to you at the start of each term.”
- [Student Loans Company, how providers set term dates](https://www.heinfo.slc.co.uk/resources/guidance/courses-management-service-user-guide/creating-courses/creating-a-full-time-undergraduate-course/term-dates/semesters-or-terms/): “You must make sure that your term start dates reflect when your students are in study. This will make sure your students get paid at the right time.”
- [NTU, published term dates](https://www.ntu.ac.uk/studenthub/my-course/timetables-dates-and-deadlines/term-dates): both standard undergraduate tables for 2026/27 list Term Two as “Monday 11 January to Friday 19 March 2027”. The Mansfield and Brackenhurst further-education tables start on 4 January; NTU also warns that “Term dates may vary.”
- [GOV.UK, SFE account](https://www.gov.uk/student-finance-register-login): students can “check when payments are due”. [SFE payment guidance](https://www.gov.uk/guidance/getting-your-first-student-finance-payment) also says: “You can check your payment schedule and status by signing in to your online account.”

**Default:** Monday 11 January 2027 (`2027-01-11`), 52 calendar days after 20 November 2026 rather than the placeholder's 59. This is appropriate for the NTU demo; when a user enters their own scheduled date, use theirs.

**Copy:**

> Estimated loan day: Mon 11 Jan 2027 (NTU's standard undergraduate Term Two start). Check your Student Finance England account for your payment date and update it here.

## 2. Holding deposits in England

**Verdict: correct.** The Tenant Fees Act 2019 cap still applies after the Renters' Rights Act 2025 changes from 1 May 2026. It covers private student house shares and student accommodation covered by the Act. On one joint tenancy, the tenants share a single cap based on the total rent in the agreement. If housemates each have a separate tenancy, the cap is calculated on the rent for each separate agreement. This is a pre-tenancy holding deposit, not the separate tenancy/security deposit or advance rent.

- [Tenant Fees Act 2019, Schedule 1, paragraph 3(3)–(4)](https://www.legislation.gov.uk/ukpga/2019/4/schedule/1/paragraph/3): “If the amount of the holding deposit exceeds one week's rent, the amount of the excess is a prohibited payment.” The statute defines the week's rent using annual rent for that tenancy divided by 52.
- [GOV.UK, post-reform statutory enforcement guidance](https://www.gov.uk/government/publications/tenant-fees-act-amended-by-the-renters-rights-act-2025/tenant-fees-act-2019-statutory-guidance-for-enforcement-authorities): “The act applies to assured tenancies (but not social housing assured tenancies), student accommodation, tenants in Houses of Multiple Occupation (HMO) and licenses to occupy housing such as lodgers.”
- [GOV.UK, current landlord/agent guidance](https://www.gov.uk/guidance/fees-you-can-charge-as-part-of-a-tenancy#refundable-holding-deposit): “The maximum deposit amount is per tenancy not the number of tenants. For example, if three potential tenants want to share a flat on the same tenancy agreement, they would pay a total of 1 week’s rent between them.”

**Copy (for clarity):**

> In England, a holding deposit to reserve a student let covered by the Tenant Fees Act 2019 is capped at one week's rent per tenancy. If you sign one joint tenancy, that's one week's rent for the whole group, not per person.

## 3. Arranged overdraft and “used up”

**Verdict: correct.** An arranged overdraft is borrowing up to a limit agreed with the bank. Interest-free arranged overdrafts are common on dedicated UK student accounts, but approval and limits vary by bank and customer. The app's labels do not imply that borrowing is interest-free or available to everyone.

- [NatWest, student overdraft](https://www.natwest.com/current-accounts/overdrafts/student-overdraft.html): “An arranged overdraft allows you to go overdrawn up to an agreed limit.” NatWest adds: “The limits shown are maximum amounts, and if approved, your overdraft limit may be lower than the maximum.”
- [HSBC UK, Student Bank Account](https://www.hsbc.co.uk/current-accounts/products/student/): “We offer an interest-free arranged overdraft of up to £1,000 when you open this account.”
- [Nationwide, FlexStudent](https://www.nationwide.co.uk/current-accounts/flexstudent): “An interest-free arranged overdraft”; “Apply for up to £1,000 in year 1 and up to £3,000 by year 3.”

**Copy:** Keep “Arranged overdraft” and “Overdraft used up”. Only show “used up” if the user has an arranged limit and has no borrowing left within it. For someone without an arrangement, use “No arranged overdraft”. Optional helper text: “Borrowing up to the limit agreed with your bank.”

## 4. Lunch meal-deal conversion

**Verdict: needs rewording.** The sampled standard lunch deals cluster around £4 outside London's higher-priced Boots stores. Use **£4.00 (400p)** as a round estimate, not a price promise or a UK-wide average. This comparison is for a standard main, snack and drink, not premium lunch or dine-in bundles.

| Retailer                              | With loyalty card | Without loyalty card |
| ------------------------------------- | ----------------: | -------------------: |
| Tesco (Clubcard)                      |             £3.85 |                £4.25 |
| Sainsbury's (Nectar)                  |             £3.95 |                £3.95 |
| Boots outside London (Advantage Card) |             £3.99 |                £4.25 |
| Boots London (Advantage Card)         |             £4.99 |                £5.25 |

- [Tesco, 12 October 2026](https://www.tescoplc.com/tesco-signals-the-start-of-the-christmas-season-with-a-flavour-packed-meal-deal-full-of-both-familiar-favourites-and-new-flavours): “The Tesco Christmas Meal Deal, including a main, snack & drink, is available in stores and online from the 12 October, for £3.85 with a Clubcard (£4.25 without).” Its [standard Whoosh listing](https://www.tesco.com/shop/en-GB/buylists/whoosh-meal-deals/all-3pound-meal-deal/3pound-meal-deal-mains) advertises “£3.85 Meal Deal Main Clubcard Price £4.25 Meal Deal Main Regular Price”, including delivery dates covering November.
- [Sainsbury's, 30 January 2026](https://corporate.sainsburys.co.uk/news/press-releases/sainsbury-s-launches-all-new-high-protein-range-and-small-but-mighty-meals-to-support-customers-nutritional-goal/): “For those on the move, Sainsbury’s food-to-go range now also features High Protein wraps, salads and sandwiches within the £3.95 meal deal.” Its [grocery listing](https://www.sainsburys.co.uk/gol-ui/product/ProductDisplay?productUid=8273870) shows “Meal Deal for £3.95”. For the loyalty comparison, [The Standard](https://www.standard.co.uk/news/uk/cheapest-supermarket-meal-deals-uk-deals-ranked-b1248048.html) reports: “There’s no different in the meal deal price whether you have a Nectar card or not, with a flat rate of £3.95.”
- [Boots, 27 May 2026](https://www.boots-uk.com/newsroom/news-item/boost-by-boots-new-healthy-meal-deal-choices-respond-to-growing-needs-of-glp-1-users/), confirms the meal-deal range but does not give the bundle prices. The most recent prices found are from [Retail Times, 1 October 2026](https://retailtimes.co.uk/boots-launches-new-christmas-and-premium-meal-deal-range/), a secondary source: “Meal deal costs £3.99 with a Boots Advantage Card and £4.25 without. £5.25 or £4.99 with a Boots Advantage Card in London”. A November Boots price list was not independently verified.

**Copy:**

> ≈ {count} meal deals a week (using £4 per meal deal; prices vary).

## 5. Fair-division credits and budget limits

**Verdict: needs rewording.** The two existing credits are correct. Spliddit's published rent method uses envy-free maximin: maximize the least-satisfied participant's utility subject to no one preferring another room at its assigned rent. That is not the same as imposing a hard budget for each participant.

- [Carnegie Mellon University, Spliddit launch](https://www.cmu.edu/news/stories/archives/2014/november/november4_spliddit.html) identifies the project and its university origin: “Ariel Procaccia, an assistant professor of computer science who leads the Spliddit project”.
- [Spliddit, rent algorithm overview](http://www.spliddit.org/apps/rent): “We then compute prices for the rooms that maximize the minimum benefit derived by any player (this is the objective function), subject to envy-freeness, by solving a linear program.” This is its currently documented method; the production solver was not independently audited.
- Gal, Mash, Procaccia and Zick, “Which Is the Fairest (Rent Division) of Them All?”, [ACM EC 2016](https://doi.org/10.1145/2940716.2940724) and [Journal of the ACM 2017](https://doi.org/10.1145/3131361). In [their Communications of the ACM article](https://cacm.acm.org/research/which-is-the-fairest-rent-division-of-them-all/), the authors confirm: “Based on these results, we have implemented the polynomial-time algorithm of Section 3, with the maximin objective function.”
- Ariel D. Procaccia, Rodrigo A. Velez and Dingli Yu, [“Fair Rent Division on a Budget”, AAAI 2018](https://doi.org/10.1609/aaai.v32i1.11465). The abstract describes an extension that “takes budget constraints as part of its input”; it checks if a split satisfies both envy-freeness and individual budgets.
- [Fair Divider, how it works](https://fairdivider.com/how-it-works), describes participants who “take turns choosing a room at the proposed prices.” Its [unequal-incomes guide](https://fairdivider.com/split-rent-unequal-incomes) says: “Fair Divider does not divide rent by income or determine ability to pay; it uses room preferences.” Neither Fair Divider's public workflow nor Spliddit's rent documentation showed a per-person maximum-rent input enforced by the solver. Someone can prefer a cheaper room without the tool enforcing that preference as a budget. This is not an exhaustive survey of other products.

**Copy (credits):**

> Fair rent maths inspired by Spliddit (Carnegie Mellon University) and “Fair Rent Division on a Budget” (Procaccia, Velez & Yu, AAAI 2018).

**Copy (replace “none we found handle budgets”):**

> Dibs lets each housemate set a weekly rent limit and checks whether a fair split can fit everyone's limit.
