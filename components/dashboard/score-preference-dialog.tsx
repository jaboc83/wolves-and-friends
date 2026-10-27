"use client";
import { useEffect, useRef, useState } from "react";
export default function ScorePreferenceDialog({
  open,
  onChoose,
}: {
  open: boolean;
  onChoose: (hidden: boolean, ask: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [ask, setAsk] = useState(true);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="score-choice"
      aria-labelledby="score-choice-title"
      aria-describedby="score-choice-description"
      onCancel={(event) => event.preventDefault()}
    >
      <h2 id="score-choice-title">Would you like to see scores?</h2>
      <p id="score-choice-description">
        Your choice is saved in this browser. You can change it anytime using
        the Hide scores / Show scores button.
      </p>
      <label>
        <input
          type="checkbox"
          checked={ask}
          onChange={(event) => setAsk(event.target.checked)}
        />{" "}
        Ask me this every time I visit
      </label>
      <div className="score-choice-actions">
        <button autoFocus onClick={() => onChoose(true, ask)}>
          Hide scores
        </button>
        <button onClick={() => onChoose(false, ask)}>Show scores</button>
      </div>
    </dialog>
  );
}
