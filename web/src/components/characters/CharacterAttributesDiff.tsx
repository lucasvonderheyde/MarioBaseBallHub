import type { CharacterRatings } from "@/data/character-ratings";

type Props = {
  charAName: string;
  charBName: string;
  ratingsA: CharacterRatings;
  ratingsB: CharacterRatings;
};

type FieldDef = {
  label: string;
  valueA: string;
  valueB: string;
};

const ATTRIBUTE_SECTIONS: {
  title: string;
  fields: (ratings: CharacterRatings) => { label: string; value: string }[];
}[] = [
  {
    title: "Profile",
    fields: (ratings) => [
      { label: "Class", value: ratings.characterClass },
      { label: "Captain", value: ratings.isCaptain ? "Yes" : "No" },
      { label: "Weight", value: ratings.weight },
      { label: "Speed", value: ratings.speed },
      { label: "Ability 1", value: ratings.ability1 },
      { label: "Ability 2", value: ratings.ability2 },
      ...(ratings.extra ? [{ label: "Extra", value: ratings.extra }] : []),
    ],
  },
  {
    title: "Pitching",
    fields: (ratings) => [
      { label: "Star pitch", value: ratings.starPitch },
      { label: "Fastball speed", value: ratings.fastBallSpeed },
      { label: "Curveball speed", value: ratings.curveBallSpeed },
      { label: "Curve", value: ratings.curve },
      { label: "Cursed ball", value: ratings.cursedBall },
      { label: "Curve control", value: ratings.curveControl },
    ],
  },
  {
    title: "Fielding",
    fields: (ratings) => [
      { label: "Fielding arm", value: ratings.fieldingArm },
      { label: "Throwing power", value: ratings.throwingPower },
    ],
  },
  {
    title: "Batting",
    fields: (ratings) => [
      { label: "Batting stance", value: ratings.battingStance },
      { label: "Star swing", value: ratings.starSwing },
      { label: "Slap hit power", value: ratings.slapHitPower },
      { label: "Charge hit power", value: ratings.chargeHitPower },
      { label: "Bunting", value: ratings.bunting },
      { label: "Horizontal trajectory", value: ratings.horizontalTrajectory },
      { label: "Vertical trajectory", value: ratings.verticalTrajectory },
    ],
  },
];

function normalize(value: string): string {
  return value.trim() || "—";
}

export function CharacterAttributesDiff({
  charAName,
  charBName,
  ratingsA,
  ratingsB,
}: Props) {
  return (
    <section className="msb-panel p-4 sm:p-5">
      <h2 className="text-lg font-semibold">Attribute differences</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Base game ratings from the character stats sheet. Highlighted rows differ
        between {charAName} and {charBName}.
      </p>

      <div className="mt-6 space-y-8">
        {ATTRIBUTE_SECTIONS.map((section) => {
          const fieldsA = section.fields(ratingsA);
          const fieldsB = section.fields(ratingsB);
          const rows: FieldDef[] = fieldsA.map((field, index) => ({
            label: field.label,
            valueA: normalize(field.value),
            valueB: normalize(fieldsB[index]?.value ?? ""),
          }));

          return (
            <div key={section.title}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                {section.title}
              </h3>
              <div className="msb-table-wrap mt-3">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500">
                      <th className="py-1 pr-2">Attribute</th>
                      <th className="py-1 pr-2">{charAName}</th>
                      <th className="py-1 pr-2">{charBName}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const differs = row.valueA !== row.valueB;
                      return (
                        <tr
                          key={row.label}
                          className={`border-b border-zinc-900 ${
                            differs ? "bg-amber-950/20" : ""
                          }`}
                        >
                          <td className="py-1 pr-2 text-zinc-400">{row.label}</td>
                          <td className="py-1 pr-2">{row.valueA}</td>
                          <td className="py-1 pr-2">{row.valueB}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
