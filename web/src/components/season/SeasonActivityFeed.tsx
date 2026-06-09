type Props = {
  events: { id: string; message: string; createdAt: Date }[];
};

export function SeasonActivityFeed({ events }: Props) {
  return (
    <section className="mt-8 msb-panel p-4 sm:p-5">
      <h2 className="text-lg font-semibold">Activity</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Game uploads, trades, and schedule updates will appear here.
      </p>
      {events.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-wrap gap-x-2 border-b border-zinc-900 py-2 text-zinc-300"
            >
              <span className="text-zinc-500">
                {event.createdAt.toLocaleString()}
              </span>
              <span>{event.message}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-zinc-600">No activity yet this season.</p>
      )}
    </section>
  );
}
