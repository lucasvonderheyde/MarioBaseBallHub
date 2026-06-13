import { Fragment } from "react";
import { SectionHeading } from "@/components/SectionHeading";
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
      <SectionHeading>Attribute differences</SectionHeading>
      <p className="mt-1 text-sm text-zinc-500">
        Base game ratings from the character stats sheet. Highlighted rows differ
        between {charAName} and {charBName}.
      </p>

      <div className="msb-table-wrap mt-6">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[38%]" />
            <col className="w-[31%]" />
            <col className="w-[31%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="py-2 pr-4 text-left">Attribute</th>
              <th className="py-2 pr-4 text-left">{charAName}</th>
              <th className="py-2 text-left">{charBName}</th>
            </tr>
          </thead>
          <tbody>
            {ATTRIBUTE_SECTIONS.map((section) => {
              const fieldsA = section.fields(ratingsA);
              const fieldsB = section.fields(ratingsB);
              const rows: FieldDef[] = fieldsA.map((field, index) => ({
                label: field.label,
                valueA: normalize(field.value),
                valueB: normalize(fieldsB[index]?.value ?? ""),
              }));

              return (
                <Fragment key={section.title}>
                  <tr className="border-b border-zinc-800">
                    <td
                      colSpan={3}
                      className="bg-zinc-950/60 py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-400"
                    >
                      {section.title}
                    </td>
                  </tr>
                  {rows.map((row) => {
                    const differs = row.valueA !== row.valueB;
                    return (
                      <tr
                        key={`${section.title}-${row.label}`}
                        className={`border-b border-zinc-900 ${
                          differs ? "bg-amber-950/20" : ""
                        }`}
                      >
                        <td className="py-1.5 pr-4 text-zinc-400">{row.label}</td>
                        <td className="py-1.5 pr-4 tabular-nums">{row.valueA}</td>
                        <td className="py-1.5 tabular-nums">{row.valueB}</td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
