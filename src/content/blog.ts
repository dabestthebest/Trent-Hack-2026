// Til Loan Day's money blog. Posts are authored here in code: there is no backend and no user posting.
//
// Every fact below comes from docs/FACT-CHECK.md (checked 20 November 2026). Don't add statistics or
// claims that aren't in that file. Inline links are written as [label](https://…) inside text and
// rendered as real links by src/components/blog/RichText.tsx.

/** One block of a post body. `text` and list `items` may contain inline [label](https://…) links. */
export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "tip"; text: string }
  | { type: "list"; items: string[] };

/** The call to action at the end of a post. `to` must be an existing app route. */
export interface BlogCta {
  to: "/" | "/dibs";
  emoji: string;
  heading: string;
  text: string;
  label: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  emoji: string;
  /** Publish date, "YYYY-MM-DD". */
  date: string;
  /** When the facts were last checked against the linked sources, "YYYY-MM-DD". */
  checked: string;
  readMins: number;
  /** One or two sentences: the card blurb, the TL;DR box and the meta description. */
  summary: string;
  body: Block[];
  cta: BlogCta;
}

const SRC = {
  sfeTerms:
    "https://www.gov.uk/government/publications/student-loans-a-guide-to-terms-and-conditions/student-loans-a-guide-to-terms-and-conditions-2026-to-2027",
  slcTermDates:
    "https://www.heinfo.slc.co.uk/resources/guidance/courses-management-service-user-guide/creating-courses/creating-a-full-time-undergraduate-course/term-dates/semesters-or-terms/",
  ntuTermDates:
    "https://www.ntu.ac.uk/studenthub/my-course/timetables-dates-and-deadlines/term-dates",
  sfeAccount: "https://www.gov.uk/student-finance-register-login",
  tenantFeesAct: "https://www.legislation.gov.uk/ukpga/2019/4/schedule/1/paragraph/3",
  tfaEnforcement:
    "https://www.gov.uk/government/publications/tenant-fees-act-amended-by-the-renters-rights-act-2025/tenant-fees-act-2019-statutory-guidance-for-enforcement-authorities",
  tfaLandlords:
    "https://www.gov.uk/guidance/fees-you-can-charge-as-part-of-a-tenancy#refundable-holding-deposit",
  spliddit: "http://www.spliddit.org/apps/rent",
  cmu: "https://www.cmu.edu/news/stories/archives/2014/november/november4_spliddit.html",
  aaai2018: "https://doi.org/10.1609/aaai.v32i1.11465",
} as const;

export const posts: readonly BlogPost[] = [
  {
    slug: "when-does-my-january-loan-land",
    title: "When does my January loan actually land?",
    emoji: "📅",
    date: "2026-11-20",
    checked: "2026-11-20",
    readMins: 2,
    summary:
      "Student Finance England pays your Maintenance Loan at the start of each term. For NTU's standard undergrad courses, Term Two starts Mon 11 Jan 2027, but your own payment date lives in your SFE account.",
    body: [
      {
        type: "p",
        text: "The overdraft is looking nervous and the group chat has one question: when does the next loan actually hit? Here's the honest answer, with sources.",
      },
      { type: "h2", text: "Start of term, not one national payday" },
      {
        type: "p",
        text: `If you're a full-time undergrad funded by Student Finance England (SFE), your Maintenance Loan comes in instalments. [GOV.UK's 2026/27 loan terms](${SRC.sfeTerms}) put it simply: “Maintenance Loans are paid directly to you at the start of each term.” If your course started in the autumn, the second instalment normally lands at the start of your second term, which is generally January.`,
      },
      {
        type: "p",
        text: `There's no single January date for everyone, though. Universities tell the Student Loans Company when their students are actually in study, and [SLC's guidance for universities](${SRC.slcTermDates}) says getting those term dates right “will make sure your students get paid at the right time.”`,
      },
      { type: "h2", text: "What that means at NTU" },
      {
        type: "p",
        text: `NTU's [published term dates](${SRC.ntuTermDates}) list Term Two for standard undergraduate courses as Monday 11 January to Friday 19 March 2027. NTU's further-education timetables for Mansfield and Brackenhurst start on 4 January, and NTU itself warns that “Term dates may vary.”`,
      },
      {
        type: "tip",
        text: `A term date isn't a payment promise. Sign in to your [Student Finance England account](${SRC.sfeAccount}) to check when your payments are due, then use that date.`,
      },
      { type: "h2", text: "How Til Loan Day uses it" },
      {
        type: "p",
        text: "Til Loan Day starts with Mon 11 Jan 2027 as an estimate for NTU undergrads. Put your own date in Your numbers, and your safe daily spend, the day calendar and every “Can I say yes?” preview recalculate around it. 💷",
      },
    ],
    cta: {
      to: "/",
      emoji: "🛟",
      heading: "Got your date?",
      text: "See what you can safely spend each day until your loan lands.",
      label: "Check your runway",
    },
  },
  {
    slug: "holding-deposits-one-week-cap",
    title: "Holding deposits: the one-week cap",
    emoji: "🔑",
    date: "2026-11-20",
    checked: "2026-11-20",
    readMins: 2,
    summary:
      "In England, a holding deposit for a student let covered by the Tenant Fees Act 2019 is capped at one week's rent per tenancy. On a joint tenancy, that's one week for the whole group, not each.",
    body: [
      {
        type: "p",
        text: "You've found the house. The group chat is going feral. Now the agent wants a holding deposit to take it off the market. Before anyone sends money, know the cap.",
      },
      { type: "h2", text: "The rule" },
      {
        type: "p",
        text: `In England, a holding deposit to reserve a student let covered by the Tenant Fees Act 2019 is capped at one week's rent per tenancy. The [Act itself](${SRC.tenantFeesAct}) says: “If the amount of the holding deposit exceeds one week's rent, the amount of the excess is a prohibited payment.” A week's rent is the tenancy's yearly rent divided by 52.`,
      },
      {
        type: "p",
        text: `The cap still applies after the Renters' Rights Act 2025 changes from 1 May 2026. [GOV.UK's enforcement guidance](${SRC.tfaEnforcement}) says the Act applies to student accommodation and to tenants in Houses of Multiple Occupation (HMOs), among others.`,
      },
      { type: "h2", text: "Per tenancy, not per person" },
      {
        type: "p",
        text: `This is the bit that catches house shares out. [GOV.UK's guidance for landlords and agents](${SRC.tfaLandlords}) says: “The maximum deposit amount is per tenancy not the number of tenants.” In their example, three people sharing a flat on one tenancy agreement “would pay a total of 1 week's rent between them.”`,
      },
      {
        type: "list",
        items: [
          "One joint tenancy: one week's rent for the whole house, shared between you.",
          "Separate tenancies: the cap is based on the rent in each person's own agreement.",
          "It's not your tenancy deposit or rent in advance. Those are separate payments.",
        ],
      },
      {
        type: "tip",
        text: "Quick maths before you pay: if the whole house is £1,560 a month on one joint tenancy, that's £1,560 × 12 ÷ 52 = £360, for all of you together.",
      },
      {
        type: "p",
        text: "This is general information, not legal advice, and it's about England only. If something feels off, check the GOV.UK guidance linked above before you pay.",
      },
    ],
    cta: {
      to: "/dibs",
      emoji: "🏡",
      heading: "Splitting the house?",
      text: "Dibs splits rooms and rent fairly, then lets you preview the holding deposit against your money before loan day.",
      label: "Open Dibs",
    },
  },
  {
    slug: "how-dibs-splits-rent",
    title: "How Dibs splits rent so nobody wants to swap",
    emoji: "⚖️",
    date: "2026-11-20",
    checked: "2026-11-20",
    readMins: 2,
    summary:
      "Dibs prices rooms so nobody would rather swap, makes the least happy housemate as happy as possible, and tells you straight when a fair split can't fit everyone's weekly limit.",
    body: [
      {
        type: "p",
        text: "One big double, one middle room, one box room. Splitting rent evenly sounds fair until someone pays the same for the smallest room. Dibs uses fair-division maths instead. Here's how, in plain words.",
      },
      { type: "h2", text: "1. Everyone says what each room is worth to them" },
      {
        type: "p",
        text: "Each housemate says how much more per week they'd pay for each room than for the box room. Never home? Maybe the double isn't worth much to you. Work from your room? It might be worth a lot. Right now Dibs handles three housemates and three rooms.",
      },
      { type: "h2", text: "2. Nobody wants to swap" },
      {
        type: "p",
        text: "Dibs picks who gets which room and sets prices that add up to the total rent and are envy-free: at those prices, nobody would rather have someone else's room.",
      },
      { type: "h2", text: "3. Look after the least happy person" },
      {
        type: "p",
        text: `There can be lots of envy-free splits, so Dibs uses the maximin idea: make the least happy person as happy as possible. It's inspired by [Spliddit](${SRC.spliddit}), a fair-division project from [Carnegie Mellon University](${SRC.cmu}), which describes prices that “maximize the minimum benefit derived by any player” while staying envy-free.`,
      },
      { type: "h2", text: "4. Weekly limits, and honesty" },
      {
        type: "p",
        text: `Dibs lets each housemate set a weekly rent limit and checks whether a fair split can fit everyone's limit. That follows “Fair Rent Division on a Budget” by Procaccia, Velez and Yu ([AAAI 2018](${SRC.aaai2018})), which takes budget constraints as part of its input.`,
      },
      {
        type: "p",
        text: "If no split is fair and within everyone's limit, Dibs tells you so rather than quietly bending a rule. Then you can raise a limit, rethink your answers or find a cheaper house.",
      },
      {
        type: "tip",
        text: "Not sure what a room is worth to you? Ask how much extra per week you'd happily pay for it over the box room. Zero is fine, and you can go negative if you'd only take it for less.",
      },
    ],
    cta: {
      to: "/dibs",
      emoji: "🏠",
      heading: "Try it on your house",
      text: "Add your rooms and rent, answer a couple of questions each, and see a split nobody wants to swap.",
      label: "Open Dibs",
    },
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}

/** Plain words in a post (link labels count, URLs don't), for read-time checks. */
export function postWordCount(post: BlogPost): number {
  const texts = post.body.flatMap((b) => (b.type === "list" ? b.items : [b.text]));
  return texts
    .join(" ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
