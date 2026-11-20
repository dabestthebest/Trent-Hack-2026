import { ClipboardCopy, Download, FileUp, Trash2, Trophy } from "lucide-react";
import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";

import { pounds } from "@/lib/dibs/format";
import {
  buildCard,
  cardLevel,
  cardRank,
  parseCard,
  serializeCard,
  type FriendCard,
  type ShareChoices,
} from "@/lib/fun/friendCard";
import { questProgress } from "@/lib/fun/quests";
import { useFun } from "@/lib/fun/store";
import { useMoney } from "@/lib/money/store";
import { cn } from "@/lib/utils";

const CHOICES: { key: keyof ShareChoices; label: string }[] = [
  { key: "level", label: "Level & rank" },
  { key: "xp", label: "XP" },
  { key: "quests", label: "Quests done today" },
  { key: "saved", label: "Saved by skipping" },
];

export const FRIENDS_KEY = "tld-friends-v1";

interface Row {
  id: string;
  card: FriendCard;
  you: boolean;
}

/** Friends with no accounts: swap a small file with only what each of you chose to share. */
export function Friends() {
  const fun = useFun();
  const { skippedPence } = useMoney();
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("Me");
  const [choices, setChoices] = useState<ShareChoices>({
    level: true,
    xp: true,
    quests: true,
    saved: false,
  });
  const [friends, setFriends] = useState<Row[]>([]);
  const [paste, setPaste] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Friends stay on this device (browser storage, never cookies, so nothing is sent to a server).
  // Saved cards are re-validated on load, exactly like a freshly imported file.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FRIENDS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { name?: unknown; choices?: unknown; cards?: unknown };
        if (typeof saved.name === "string") setName(saved.name.slice(0, 20));
        if (saved.choices && typeof saved.choices === "object") {
          const c = saved.choices as Record<string, unknown>;
          setChoices({
            level: c["level"] !== false,
            xp: c["xp"] !== false,
            quests: c["quests"] !== false,
            saved: c["saved"] === true,
          });
        }
        if (Array.isArray(saved.cards)) {
          const rows: Row[] = [];
          for (const text of saved.cards.slice(0, 50)) {
            if (typeof text !== "string") continue;
            const r = parseCard(text);
            if (r.ok && !rows.some((x) => x.card.name === r.card.name)) {
              rows.push({ id: `${r.card.name}-${rows.length}`, card: r.card, you: false });
            }
          }
          setFriends(rows);
        }
      }
    } catch {
      // Storage blocked or junk data: start with no friends.
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(
        FRIENDS_KEY,
        JSON.stringify({ name, choices, cards: friends.map((f) => serializeCard(f.card)) }),
      );
    } catch {
      // Storage blocked: friends just won't persist.
    }
  }, [loaded, name, choices, friends]);

  const mine = buildCard(name, choices, {
    xp: fun.xp,
    questsToday: questProgress(fun).done,
    savedPence: skippedPence,
  });

  const download = () => {
    const blob = new Blob([serializeCard(mine)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "til-loan-day-friend-card.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMessage("Friend card downloaded. Send it to a friend in any chat.");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(serializeCard(mine));
      setMessage("Friend card copied. Paste it into a chat.");
    } catch {
      setMessage("Couldn't copy automatically. Use Download instead.");
    }
  };

  const addFromText = (text: string) => {
    const r = parseCard(text);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError(null);
    setFriends((fs) => [
      ...fs.filter((f) => f.card.name !== r.card.name),
      { id: `${r.card.name}-${fs.length}`, card: r.card, you: false },
    ]);
    setMessage(`Added ${r.card.name}. Let the friendly competition begin 🏁`);
    setPaste("");
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 4000) {
      setError("That file is too big to be a friend card.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => addFromText(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => setError("Couldn't read that file.");
    reader.readAsText(file);
  };

  // Everyone who shared XP, highest first. You always appear (with your own full numbers).
  const board: Row[] = [
    {
      id: "you",
      card: {
        ...buildCard(
          name,
          { level: true, xp: true, quests: true, saved: true },
          { xp: fun.xp, questsToday: questProgress(fun).done, savedPence: skippedPence },
        ),
      },
      you: true,
    },
    ...friends,
  ];
  const xpBoard = board
    .filter((r) => r.card.xp !== null)
    .sort((a, b) => (b.card.xp ?? 0) - (a.card.xp ?? 0));
  const savedBoard = board
    .filter((r) => r.card.savedPence !== null)
    .sort((a, b) => (b.card.savedPence ?? 0) - (a.card.savedPence ?? 0));

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div>
        <h2 id={`${id}-heading`} className="font-display text-xl font-semibold">
          👯 Friends
        </h2>
        <p className="text-sm text-muted-foreground">
          No accounts. Swap a small friend-card file with only what you choose to share, then race
          each other on XP and saving.
        </p>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-background/60 p-3">
        <p className="text-sm font-semibold">Your friend card</p>
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          <span>Name on your card</span>
          <input
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-card px-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <fieldset className="grid grid-cols-2 gap-1.5">
          <legend className="mb-1 text-xs font-medium text-muted-foreground">Share</legend>
          {CHOICES.map((c) => (
            <label
              key={c.key}
              className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-2 text-sm"
            >
              <input
                type="checkbox"
                checked={choices[c.key]}
                onChange={(e) => setChoices((s) => ({ ...s, [c.key]: e.target.checked }))}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              {c.label}
            </label>
          ))}
        </fieldset>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={download}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Download
          </button>
          <button
            type="button"
            onClick={copy}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ClipboardCopy className="h-4 w-4" aria-hidden="true" /> Copy as text
          </button>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
        <p className="text-sm font-semibold">Add a friend</p>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.json,text/plain,application/json"
          onChange={onFile}
          className="sr-only"
          aria-label="Friend card file"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <FileUp className="h-4 w-4" aria-hidden="true" /> Open their friend card file
        </button>
        <label htmlFor={`${id}-paste`} className="block text-xs font-medium text-muted-foreground">
          …or paste the text they sent you
        </label>
        <textarea
          id={`${id}-paste`}
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={2}
          maxLength={4000}
          className="w-full resize-none rounded-lg border border-border bg-card p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={() => addFromText(paste)}
          disabled={paste.trim() === ""}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-foreground px-3 text-sm font-semibold text-background disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
        >
          Add friend
        </button>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      <div aria-live="polite">
        {message ? <p className="text-sm font-medium text-success-strong">{message}</p> : null}
      </div>

      {friends.length > 0 ? (
        <div className="space-y-3">
          <Board title="XP race" icon="⚡" rows={xpBoard} value={(c) => `${c.xp ?? 0} XP`} />
          {savedBoard.length > 1 ? (
            <Board
              title="Savings jar race"
              icon="🫙"
              rows={savedBoard}
              value={(c) => pounds(c.savedPence ?? 0)}
            />
          ) : null}
          <ul className="space-y-1.5" aria-label="Your friends">
            {friends.map((f) => {
              const rank = cardRank(f.card);
              const level = cardLevel(f.card);
              return (
                <li
                  key={f.id}
                  className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2 text-sm"
                >
                  <span aria-hidden="true">{rank?.emoji ?? "🙂"}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{f.card.name}</span>
                  <span className="text-muted-foreground">
                    {level !== null ? `Lv ${level}` : "Level hidden"}
                    {rank ? ` · ${rank.name}` : ""}
                    {f.card.questsToday !== null ? ` · ${f.card.questsToday}/6 quests` : ""}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${f.card.name}`}
                    onClick={() => setFriends((fs) => fs.filter((x) => x.id !== f.id))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Friends are saved in this browser on your device, and in whatever chat you send cards
        through. Nothing goes to a server.{" "}
        {friends.length > 0 ? (
          <button
            type="button"
            onClick={() => setFriends([])}
            className="font-semibold underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Forget all friends
          </button>
        ) : null}
      </p>
    </section>
  );
}

function Board({
  title,
  icon,
  rows,
  value,
}: {
  title: string;
  icon: string;
  rows: Row[];
  value: (c: FriendCard) => string;
}) {
  return (
    <div className="rounded-xl bg-secondary/60 p-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <Trophy className="h-4 w-4" aria-hidden="true" /> <span aria-hidden="true">{icon}</span>{" "}
        {title}
      </p>
      <ol className="mt-2 space-y-1" aria-label={title}>
        {rows.map((r, i) => (
          <li
            key={r.id}
            className={cn(
              "flex items-center justify-between gap-2 text-sm",
              r.you && "font-semibold",
            )}
          >
            <span>
              {i + 1}. {r.you ? `${r.card.name} (you)` : r.card.name}
            </span>
            <span className="tabular-nums">{value(r.card)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
