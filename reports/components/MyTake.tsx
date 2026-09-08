type MyTakeProps = {
  text?: string;
  heading?: string;
};

export function MyTake({ text, heading = "My take" }: MyTakeProps) {
  if (!text) return null;

  return (
    <section className="avoid-break rounded-[4px] border border-border bg-subtle px-4 py-4">
      <div className="rule-gold mb-2.5" />
      <p className="eyebrow">{heading}</p>
      <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-dark">{text}</p>
    </section>
  );
}
