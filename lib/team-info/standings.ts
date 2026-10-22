import type { Table } from "./index";

// Sorts standings and adds competition-specific postseason qualification markers.
// Qualification lines use the table's rank scope, never a guessed division cutoff.
export function tableSeasonType(table: Table, id = "") {
  return /preseason|pre-season|spring training/i.test(table.note || "")
    ? 1
    : /postseason|post-season|playoffs/i.test(table.note || "")
      ? 3
      : ["loons", "palace"].includes(id) && table.seasonType === 1
        ? 2
        : (table.seasonType ??
          (/regular.?season/i.test(table.note || "") ? 2 : undefined));
}
export function decorateTable(table: Table, id: string): Table {
  const rows = [...table.rows].sort(
    (a, b) => Number(a.cells[0]) - Number(b.cells[0]),
  );
  const cuts: { after: number; label: string }[] = [];
  let qualification = "";
  // Legacy cached tables carry a note instead of structured season metadata.
  // Never apply qualification boundaries to preseason or postseason standings.
  if (tableSeasonType(table, id) !== 2)
    return { ...table, rows, cuts, qualification };
  if (id === "wolves") {
    cuts.push(
      { after: 6, label: "Direct playoff places end · 7–10 enter the Play-In" },
      { after: 10, label: "Play-In places end" },
    );
    qualification =
      "Regular-season format: top 6 in each conference qualify directly; 7–10 enter the Play-In.";
  }
  if (id === "vikings") {
    cuts.push(
      { after: 4, label: "Division-winner seeds end · 5–7 are wild cards" },
      { after: 7, label: "Playoff places end" },
    );
    qualification =
      "Conference playoff seeds: four division winners, then three wild cards. Positions are provisional until clinched.";
  }
  if (id === "twins") {
    cuts.push(
      { after: 3, label: "Division-winner seeds end · 4–6 are wild cards" },
      { after: 6, label: "Postseason places end" },
    );
    qualification =
      "League playoff seeds: three division winners and three wild cards.";
  }
  if (id === "loons") {
    cuts.push(
      { after: 7, label: "Direct Round One places end · 8–9 enter Wild Card" },
      { after: 9, label: "Playoff places end" },
    );
    qualification =
      "Top 9 per conference qualify: 1–7 enter Round One; 8–9 play the Wild Card match.";
  }
  if (id === "palace") {
    cuts.push(
      {
        after: 4,
        label:
          "Base Champions League places end · UEFA may add a performance place",
      },
      {
        after: 7,
        label:
          "European places may extend through 7th · cup winners can shift the cutoff",
      },
      { after: 17, label: "Relegation zone · places 18–20" },
    );
    qualification =
      "The top four are the base Champions League places. UEFA performance spots and domestic cup winners can change European cutoffs; the bottom three are relegated.";
  }
  if (id === "wild") {
    if (table.name.includes("Division"))
      cuts.push({ after: 3, label: "Automatic division playoff places end" });
    else if (table.name.includes("Wild Card"))
      cuts.push({ after: 2, label: "Wild-card playoff places end" });
    qualification =
      "NHL qualification: top 3 in each division plus 2 wild cards per conference. Division tables show automatic places; the wild-card table excludes the top 3 from each division. Positions are provisional until clinched.";
  }
  if (id === "lynx")
    qualification =
      "WNBA qualification: the top 8 across the entire league. This feed provides a conference table, so no conference cutoff is drawn.";
  return { ...table, rows, cuts, qualification };
}
