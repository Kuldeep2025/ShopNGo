import { returnPolicyText, warrantyText, type PolicyFields } from "./policy";

/** "Returns, warranty and guarantee" block for the product page. It only states what the seller has set. */
export function PolicySection({ policy }: { policy?: Partial<PolicyFields> | null }) {
  const p = policy ?? {};
  return (
    <section aria-labelledby="policy-h" className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 id="policy-h" className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
        Returns, warranty and guarantee
      </h2>
      <dl className="mt-3 space-y-2 text-sm text-gray-800 dark:text-zinc-200">
        <div>
          <dt className="font-medium">Returns</dt>
          <dd>{returnPolicyText(p.returnDays)}</dd>
        </div>
        <div>
          <dt className="font-medium">Warranty</dt>
          <dd>{p.warrantyMonths === null || p.warrantyMonths === undefined ? "The seller has not stated a warranty." : warrantyText(p.warrantyMonths)}</dd>
        </div>
        <div>
          <dt className="font-medium">Guarantee</dt>
          <dd>{p.guaranteeText || "The seller has not added a guarantee."}</dd>
        </div>
        <div>
          <dt className="font-medium">Replacement</dt>
          <dd>{p.replacementPolicy || "The seller has not added a replacement policy."}</dd>
        </div>
      </dl>
    </section>
  );
}
