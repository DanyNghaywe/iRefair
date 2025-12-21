type AutosaveHintProps = {
  saving?: boolean;
  savedAt?: string | null;
  idleLabel?: string;
};

export function AutosaveHint({ saving, savedAt, idleLabel = "Live autosave" }: AutosaveHintProps) {
  if (saving) {
    return <p className="field-hint">Saving...</p>;
  }
  if (savedAt) {
    return <p className="field-hint">Saved {savedAt}</p>;
  }
  return <p className="field-hint">{idleLabel}</p>;
}
