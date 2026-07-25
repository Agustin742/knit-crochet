import { APP_NAME } from "@/shared/config";

export default function HomePage() {
  return (
    <div className="p-[var(--space-6)]">
      <h1 className="font-display text-2xl text-fg-inverse">{APP_NAME}</h1>
      <p className="mt-[var(--space-2)] text-fg-inverse-muted">
        Gestiona tus proyectos de tejido de dos agujas y crochet.
      </p>
    </div>
  );
}
