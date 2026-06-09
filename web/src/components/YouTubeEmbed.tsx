import { parseYouTubeVideoId, youTubeEmbedUrl } from "@/lib/youtube";

type Props = {
  url: string;
  title?: string;
};

export function YouTubeEmbed({ url, title = "Game video" }: Props) {
  const videoId = parseYouTubeVideoId(url);
  if (!videoId) {
    return (
      <p className="text-sm text-zinc-500">
        Video link saved, but it could not be embedded. Check the URL is a single
        YouTube video (unlisted watch links work).
      </p>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border border-zinc-800 bg-black">
      <iframe
        className="h-full w-full"
        src={youTubeEmbedUrl(videoId)}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}
