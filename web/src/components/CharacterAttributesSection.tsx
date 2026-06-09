import type { CharacterRatings } from "@/data/character-ratings";

type Props = {
  ratings: CharacterRatings;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-zinc-500">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

export function CharacterAttributesSection({ ratings }: Props) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <h2 className="text-lg font-semibold">Character attributes</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Base game ratings from the character stats sheet (not league game stats).
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Profile
          </h3>
          <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Class" value={ratings.characterClass} />
            <Field label="Captain" value={ratings.isCaptain ? "Yes" : "No"} />
            <Field label="Weight" value={ratings.weight} />
            <Field label="Speed" value={ratings.speed} />
            <Field label="Ability 1" value={ratings.ability1} />
            <Field label="Ability 2" value={ratings.ability2} />
            {ratings.extra ? <Field label="Extra" value={ratings.extra} /> : null}
          </dl>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Pitching
          </h3>
          <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Star pitch" value={ratings.starPitch} />
            <Field label="Fastball speed" value={ratings.fastBallSpeed} />
            <Field label="Curveball speed" value={ratings.curveBallSpeed} />
            <Field label="Curve" value={ratings.curve} />
            <Field label="Cursed ball" value={ratings.cursedBall} />
            <Field label="Curve control" value={ratings.curveControl} />
          </dl>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Fielding
          </h3>
          <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Fielding arm" value={ratings.fieldingArm} />
            <Field label="Throwing power" value={ratings.throwingPower} />
          </dl>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Batting
          </h3>
          <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Batting stance" value={ratings.battingStance} />
            <Field label="Star swing" value={ratings.starSwing} />
            <Field label="Slap hit power" value={ratings.slapHitPower} />
            <Field label="Charge hit power" value={ratings.chargeHitPower} />
            <Field label="Bunting" value={ratings.bunting} />
            <Field label="Horizontal trajectory" value={ratings.horizontalTrajectory} />
            <Field label="Vertical trajectory" value={ratings.verticalTrajectory} />
          </dl>
        </div>
      </div>
    </section>
  );
}
