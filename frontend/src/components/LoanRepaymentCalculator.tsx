import { useEffect, useMemo, useState } from "react";
import HealthGauge from "@/components/HealthGauge";
import EmptyState from "@/components/EmptyState";
import { EmptyLoansIllustration } from "@/components/illustrations";

interface Props {
  onProceed: (loanId: string, amount: string) => void;
  onApplyForLoan?: () => void;
}

interface RepaymentPreview {
  loan_id: number;
  repayment_amount: number;
  breakdown: {
    principal: number;
    interest: number;
    fees: number;
    remaining_balance: number;
  };
  projected_health_factor_bps: number | null;
  fully_repaid: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function formatAmount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export default function LoanRepaymentCalculator({ onProceed, onApplyForLoan }: Props) {
  const [loanId, setLoanId] = useState("");
  const [amount, setAmount] = useState("");
  const [loanOptions, setLoanOptions] = useState<number[]>([]);
  const [loansLoaded, setLoansLoaded] = useState(false);
  const [preview, setPreview] = useState<RepaymentPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedLoanId = useMemo(() => Number(loanId), [loanId]);
  const parsedAmount = useMemo(() => Number(amount), [amount]);

  useEffect(() => {
    let mounted = true;
    async function loadLoans() {
      try {
        const res = await fetch(`${API}/api/loans?page=1&pageSize=50`);
        if (!res.ok) return;
        const body = await res.json();
        const ids = Array.isArray(body?.data)
          ? body.data
              .map((item: { id?: number | string }) => Number(item?.id))
              .filter((id: number) => Number.isFinite(id))
          : [];
        if (mounted) { setLoanOptions(ids); setLoansLoaded(true); }
      } catch {
        if (mounted) setLoansLoaded(true);
      }
    }
    void loadLoans();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!Number.isInteger(parsedLoanId) || parsedLoanId < 0 || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setPreview(null); setError(null); return;
    }
    const timeout = setTimeout(async () => {
      try {
        setLoading(true); setError(null);
        const res = await fetch(`${API}/api/loan/repayment-preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ loan_id: parsedLoanId, amount: parsedAmount }),
        });
        const body = await res.json();
        if (!res.ok) { setPreview(null); setError(body?.error || "Unable to calculate repayment preview"); return; }
        setPreview(body as RepaymentPreview);
      } catch (e: any) {
        setPreview(null); setError(e?.message || "Unable to calculate repayment preview");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [parsedAmount, parsedLoanId]);

  return (
    <div className="rounded-2xl p-6 shadow mb-4" style={{ backgroundColor: "var(--color-surface)" }}>
      <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--color-text)" }}>
        Repayment Calculator
      </h2>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
        Preview principal, interest, fees, and health impact before repaying.
      </p>

      {loansLoaded && loanOptions.length === 0 && (
        <EmptyState
          illustration={<EmptyLoansIllustration />}
          message="You have no active loans"
          ctaLabel="Apply for a Loan"
          onCta={() => onApplyForLoan?.()}
        />
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text)" }}>
            Loan ID
          </label>
          <input
            className="w-full rounded-lg px-3 py-2 min-h-[44px] bg-transparent"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}
            placeholder="Enter loan ID"
            value={loanId}
            onChange={(e) => setLoanId(e.target.value)}
            list="loan-options"
            type="number"
          />
          <datalist id="loan-options">
            {loanOptions.map((id) => (
              <option key={id} value={id} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text)" }}>
            Repayment Amount (stroops)
          </label>
          <input
            className="w-full rounded-lg px-3 py-2 min-h-[44px] bg-transparent"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}
            placeholder="Enter repayment amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
          />
        </div>
      </div>

      {loading && <p className="text-sm mt-4" style={{ color: "var(--color-text-muted)" }}>Calculating...</p>}
      {error && <p className="text-sm mt-4" style={{ color: "var(--color-text)" }}>{error}</p>}

      {preview && (
        <div className="mt-5 border rounded-xl p-4" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {[
              ["Principal", preview.breakdown.principal],
              ["Interest", preview.breakdown.interest],
              ["Fees", preview.breakdown.fees],
              ["Remaining Balance", preview.breakdown.remaining_balance],
            ].map(([label, val]) => (
              <div key={label as string} className="rounded-lg p-3" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <p style={{ color: "var(--color-text-muted)" }}>{label}</p>
                <p className="font-semibold" style={{ color: "var(--color-text)" }}>{formatAmount(val as number)}</p>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
              Projected Health Factor
            </p>
            {preview.fully_repaid ? (
              <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                Fully repaid (health factor becomes infinite).
              </p>
            ) : (
              preview.projected_health_factor_bps !== null && (
                <HealthGauge value={preview.projected_health_factor_bps} />
              )
            )}
          </div>

          <button
            type="button"
            className="mt-4 w-full bg-brown text-cream py-2.5 rounded-xl font-semibold hover:bg-brown/80 transition min-h-[44px] dark:bg-gold dark:text-brown"
            onClick={() => onProceed(String(preview.loan_id), String(preview.repayment_amount))}
          >
            Proceed to Repay
          </button>
        </div>
      )}
    </div>
  );
}
