"use client";

type Props = {
  action: () => void;
  username: string;
};

export function RemoveMemberForm({ action, username }: Props) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Remove ${username} from this league? They will lose access to league pages.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-xs text-red-400 hover:underline">
        Remove
      </button>
    </form>
  );
}
