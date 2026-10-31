/**
 * Deterministic k-means with k-means++ initialisation (seeded) and
 * z-score feature standardisation. Used for customer segmentation.
 */
import { createRng } from "./random";

export type KMeansResult = {
  labels: number[];
  centroids: number[][]; // in standardised space
  inertia: number;
  iterations: number;
};

function sqDist(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return s;
}

/** Standardise each column to mean 0, std 1 (std 0 columns become 0). */
export function standardize(rows: number[][]): { rows: number[][]; mean: number[]; std: number[] } {
  if (rows.length === 0) return { rows: [], mean: [], std: [] };
  const d = rows[0].length;
  const mean = Array.from({ length: d }, (_, j) => rows.reduce((s, r) => s + r[j], 0) / rows.length);
  const std = Array.from({ length: d }, (_, j) =>
    Math.sqrt(rows.reduce((s, r) => s + (r[j] - mean[j]) ** 2, 0) / rows.length)
  );
  return {
    rows: rows.map((r) => r.map((v, j) => (std[j] === 0 ? 0 : (v - mean[j]) / std[j]))),
    mean,
    std,
  };
}

export function kMeans(points: number[][], k: number, seed = 42, maxIterations = 100): KMeansResult {
  const n = points.length;
  if (n === 0) return { labels: [], centroids: [], inertia: 0, iterations: 0 };
  k = Math.max(1, Math.min(k, n));
  const rng = createRng(seed);

  // k-means++ seeding
  const centroids: number[][] = [points[Math.floor(rng() * n)].slice()];
  while (centroids.length < k) {
    const d2 = points.map((p) => Math.min(...centroids.map((c) => sqDist(p, c))));
    const total = d2.reduce((a, b) => a + b, 0);
    if (total === 0) {
      centroids.push(points[Math.floor(rng() * n)].slice());
      continue;
    }
    let r = rng() * total;
    let idx = 0;
    for (; idx < n - 1; idx++) {
      r -= d2[idx];
      if (r <= 0) break;
    }
    centroids.push(points[idx].slice());
  }

  const labels = new Array<number>(n).fill(-1);
  let iterations = 0;
  for (; iterations < maxIterations; iterations++) {
    let changed = false;
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const dist = sqDist(points[i], centroids[c]);
        if (dist < bestD) {
          bestD = dist;
          best = c;
        }
      }
      if (labels[i] !== best) {
        labels[i] = best;
        changed = true;
      }
    }
    // Update step
    for (let c = 0; c < k; c++) {
      const members = points.filter((_, i) => labels[i] === c);
      if (members.length === 0) continue; // keep previous centroid
      centroids[c] = centroids[c].map((_, j) => members.reduce((s, m) => s + m[j], 0) / members.length);
    }
    if (!changed) break;
  }

  const inertia = points.reduce((s, p, i) => s + sqDist(p, centroids[labels[i]]), 0);
  return { labels, centroids, inertia, iterations: iterations + 1 };
}
