type BiggestWinProps = {
  amount?: string;
  label?: string;
};

export function BiggestWin({ amount, label = "Biggest potential win" }: BiggestWinProps) {
  if (!amount) return null;

  return (
    <div className="bg-dark px-5 py-5 text-center">
      <p className="font-display text-[11px] font-bold tracking-[0.08em] text-white">{label.toUpperCase()}</p>
      <p className="mt-2 font-display text-[2.6rem] font-bold leading-none tracking-[-0.04em] text-accent">
        {amount}
      </p>
    </div>
  );
}
