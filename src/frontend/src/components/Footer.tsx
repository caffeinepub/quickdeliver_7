import { Heart } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();
  const hostname = encodeURIComponent(window.location.hostname);
  return (
    <footer className="border-t border-border bg-card py-6 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-sm text-muted-foreground">
        © {year}. Built with{" "}
        <Heart className="inline w-3.5 h-3.5 text-primary fill-primary mx-1" />{" "}
        using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${hostname}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-medium"
        >
          caffeine.ai
        </a>
      </div>
    </footer>
  );
}
