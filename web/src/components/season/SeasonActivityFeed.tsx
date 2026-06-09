import { Card } from "@/components/ui/Card";

type Props = {
  events: { id: string; message: string; createdAt: Date }[];
};

export function SeasonActivityFeed({ events }: Props) {
  return (
    <Card title="Activity">
      <p className="-mt-2 mb-3 text-sm text-zinc-500">
        Game uploads, trades, and schedule updates appear here.
      </p>
      {events.length > 0 ? (
        <ul className="mt-3">
          {events.map((event) => (
            <li
              key={event.id}
              className="msb-row-divider flex flex-wrap gap-x-2 py-2.5 text-sm text-zinc-300"
            >
              <span className="text-zinc-500">
                {event.createdAt.toLocaleString()}
              </span>
              <span>{event.message}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="msb-empty-state">
          <p className="text-sm text-zinc-500">No activity yet this season</p>
        </div>
      )}
    </Card>
  );
}
