interface RoutineItemRowProps {
  title: string;
}

export function RoutineItemRow({ title }: RoutineItemRowProps) {
  return (
    <div className="flex items-center gap-3 py-2 px-3">
      <span className="w-1.5 h-1.5 rounded-full bg-bark/20 flex-shrink-0" />
      <span className="text-sm text-bark/50">{title}</span>
    </div>
  );
}
