"use client";

interface MaterialOption {
  materialId: string;
  fileName: string;
  materialType?: string;
}

interface MaterialSelectionModalProps {
  open: boolean;
  title: string;
  subtitle: string;
  materials: MaterialOption[];
  selectedIds: string[];
  submitting: boolean;
  onToggle: (id: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function MaterialSelectionModal({
  open,
  title,
  subtitle,
  materials,
  selectedIds,
  submitting,
  onToggle,
  onClose,
  onSubmit,
}: MaterialSelectionModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-background shadow-2xl">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>

        <div className="p-6 max-h-96 overflow-y-auto space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/60 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-border">
          {materials.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
              <p className="text-sm font-semibold text-foreground">No approved materials found.</p>
              <p className="text-xs text-muted-foreground mt-1">Upload and process class materials first, then try again.</p>
            </div>
          ) : (
            materials.map((m) => {
              const checked = selectedIds.includes(m.materialId);
              return (
                <label
                  key={m.materialId}
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${checked ? "border-ecu-purple bg-ecu-purple/5" : "border-border hover:bg-muted/30"
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(m.materialId)}
                    className="mt-0.5 h-4 w-4 rounded border-border"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{m.fileName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.materialType || "Course Material"}</p>
                  </div>
                </label>
              );
            })
          )}
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg border border-border font-semibold text-sm hover:bg-muted/40 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting || selectedIds.length === 0 || materials.length === 0}
            className="px-4 py-2 rounded-lg bg-ecu-purple text-white font-semibold text-sm hover:bg-ecu-purple/90 disabled:opacity-60"
          >
            {submitting ? "Generating..." : `Generate from ${selectedIds.length} Material${selectedIds.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
