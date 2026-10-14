import { Modal } from "../ui/Modal.jsx";
import { Badge } from "../ui/Badge.jsx";
import { Button } from "../ui/Button.jsx";

export function LongevityDisclaimerModal({ isOpen, onClose }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vehicle Lifespan & Longevity Notice"
      maxWidth="max-w-lg"
    >
      <div className="flex flex-col gap-4 text-xs font-normal leading-relaxed text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <Badge variant="lime" size="sm">Verification In Progress</Badge>
          <span className="font-semibold text-slate-900 dark:text-white">Strict Data Quality Standards</span>
        </div>

        <p>
          In accordance with our strict data integrity policy, long-term vehicle longevity and lifespan
          predictions are held to rigorous statistical standards before being presented to buyers.
        </p>

        <div className="rounded-xl border border-rose-200/80 dark:border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 p-3.5 backdrop-blur-sm">
          <strong className="font-bold uppercase text-[11px] tracking-wide block text-rose-700 dark:text-rose-300 mb-1">
            Zero Fabricated Estimates
          </strong>
          <p className="text-xs text-rose-950 dark:text-rose-200">
            VehicleWise will never fabricate vehicle lifespans, invent maintenance curves,
            or present synthetic statistical estimates without audited, real-world data.
          </p>
        </div>

        <p>
          Our recommendation engine strictly evaluates verified catalog specifications (budget fit,
          reported fuel efficiency, and engine performance). Any missing or unverified attributes are
          always transparently flagged so you can make informed decisions.
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
