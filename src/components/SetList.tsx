import * as React from 'react';
import type { ExerciseLog, Unit } from '@/types';
import { SetRow } from '@/components/SetRow';

interface SetListProps {
  logs: ExerciseLog[]; // ordered by setNumber
  unit: Unit;
  weightIncrement: number;
  flashId: string | null;
  onSave: (id: string, patch: { weight: number; reps: number }) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

interface DragState {
  id: string;
  startY: number;
  startIndex: number;
  step: number; // row height + gap, for translating pointer movement into positions
}

const GAP_PX = 8; // matches the list's `gap-2`

/** Logged sets with drag-to-reorder via each row's handle. */
export function SetList({
  logs,
  unit,
  weightIncrement,
  flashId,
  onSave,
  onDelete,
  onReorder,
}: SetListProps) {
  const [order, setOrder] = React.useState<string[]>(() => logs.map((l) => l.id));
  const orderRef = React.useRef(order);
  orderRef.current = order;

  const drag = React.useRef<DragState | null>(null);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [offset, setOffset] = React.useState(0);
  const rowEls = React.useRef(new Map<string, HTMLDivElement>());

  // Adopt the persisted order whenever it changes, except mid-drag.
  React.useEffect(() => {
    if (!drag.current) setOrder(logs.map((l) => l.id));
  }, [logs]);

  const byId = React.useMemo(() => new Map(logs.map((l) => [l.id, l])), [logs]);

  const handlePointerDown = (id: string) => (e: React.PointerEvent) => {
    const el = rowEls.current.get(id);
    if (!el) return;
    e.preventDefault();
    drag.current = {
      id,
      startY: e.clientY,
      startIndex: orderRef.current.indexOf(id),
      step: el.getBoundingClientRect().height + GAP_PX,
    };
    setDragId(id);
    setOffset(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const delta = e.clientY - d.startY;
    const target = Math.max(
      0,
      Math.min(orderRef.current.length - 1, d.startIndex + Math.round(delta / d.step)),
    );
    if (target !== orderRef.current.indexOf(d.id)) {
      setOrder((prev) => {
        const next = prev.filter((x) => x !== d.id);
        next.splice(target, 0, d.id);
        return next;
      });
    }
    // Keep the dragged row under the finger after the list has reflowed.
    setOffset(delta - (target - d.startIndex) * d.step);
  };

  const endDrag = () => {
    if (!drag.current) return;
    drag.current = null;
    setDragId(null);
    setOffset(0);
    const finalOrder = orderRef.current;
    const changed = finalOrder.some((id, i) => logs[i]?.id !== id);
    if (changed) onReorder(finalOrder);
  };

  const draggable = logs.length > 1;

  return (
    <div className="flex flex-col gap-2">
      {order.map((id) => {
        const log = byId.get(id);
        if (!log) return null;
        const isDragging = dragId === id;
        return (
          <SetRow
            key={id}
            ref={(el) => {
              if (el) rowEls.current.set(id, el);
              else rowEls.current.delete(id);
            }}
            log={log}
            unit={unit}
            weightIncrement={weightIncrement}
            flash={flashId === id}
            dragging={isDragging}
            dragHandleProps={
              draggable
                ? {
                    onPointerDown: handlePointerDown(id),
                    onPointerMove: handlePointerMove,
                    onPointerUp: endDrag,
                    onPointerCancel: endDrag,
                  }
                : undefined
            }
            style={isDragging ? { transform: `translateY(${offset}px)` } : undefined}
            onSave={(patch) => onSave(id, patch)}
            onDelete={() => onDelete(id)}
          />
        );
      })}
    </div>
  );
}
