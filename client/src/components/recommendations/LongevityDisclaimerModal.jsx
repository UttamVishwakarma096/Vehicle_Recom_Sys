import { Modal } from "../ui/Modal.jsx";
import { Badge } from "../ui/Badge.jsx";
import { Button } from "../ui/Button.jsx";

export function LongevityDisclaimerModal({ isOpen, onClose }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Longevity Prediction Evidence Gate"
      maxWidth="max-w-lg"
    >
      <div className="flex flex-col gap-4 text-xs font-normal leading-relaxed text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <Badge variant="red" size="sm">STATUS: DISABLED (503)</Badge>
          <span className="font-semibold text-slate-900 dark:text-white">Evidence Gate Not Passed</span>
        </div>

        <p>
          In accordance with our strict product architecture and <strong>ML-01</strong> guidelines,
          predictive vehicle longevity estimation is disabled by default until verified evidence gates
          pass.
        </p>

        <div className="rounded-xl border border-rose-200/80 dark:border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 p-3.5 backdrop-blur-sm">
          <strong className="font-bold uppercase text-[11px] tracking-wide block text-rose-700 dark:text-rose-300 mb-1">
            Zero Fabricated Estimates
          </strong>
          <p className="text-xs text-rose-950 dark:text-rose-200">
            The Recommendation Service will never fabricate lifespans, invent maintenance curves,
            or present synthetic statistical estimates without audited, reproducible ground truth data.
          </p>
        </div>

        <p>
          Our rule-based engine (<code className="font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded-md">rules-v1</code>)
          strictly evaluates verified catalog attributes (budget fit, reported mileage, and engine power).
          Dimensions without authoritative evaluation scales are honestly disclosed under
          <strong> Missing Ground Truth Data</strong>.
        </p>

        <div className="mt-2 flex justify-end">
          <Button variant="primary" size="sm" onClick={onClose}>
            Understood
          </Button>
        </div>
      </div>
    </Modal>
  );
}
