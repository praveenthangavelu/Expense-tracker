// High-resolution performance monitor using process.hrtime.bigint().
// Tracks count, total, min, max, and average duration per labeled operation.
// Warnings are emitted for any operation that takes longer than 500ms.

class PerfMonitor {
  constructor() {
    // Map of label -> { count, total, max, min }
    this.metrics = new Map();
  }

  // Call before an operation to capture the start timestamp.
  startTimer(label) {
    return { label, start: process.hrtime.bigint() };
  }

  // Call after an operation to record the duration.
  // Returns duration in milliseconds as a number.
  endTimer(timer) {
    const duration = Number(process.hrtime.bigint() - timer.start) / 1_000_000;

    const existing = this.metrics.get(timer.label) || {
      count: 0,
      total: 0,
      max: 0,
      min: Infinity,
    };

    existing.count++;
    existing.total += duration;
    existing.max = Math.max(existing.max, duration);
    existing.min = Math.min(existing.min, duration);
    this.metrics.set(timer.label, existing);

    // Warn in logs so slow operations are visible without extra tooling.
    if (duration > 500) {
      console.warn(
        `⚠️  Slow operation: ${timer.label} took ${duration.toFixed(2)}ms`
      );
    }

    return duration;
  }

  // Return a snapshot of all recorded metrics.
  getStats() {
    const stats = {};
    for (const [label, data] of this.metrics) {
      stats[label] = {
        count: data.count,
        avgMs: (data.total / data.count).toFixed(2),
        maxMs: data.max.toFixed(2),
        minMs: data.min === Infinity ? "0.00" : data.min.toFixed(2),
      };
    }
    return stats;
  }

  // Clear all accumulated metrics (e.g., on a scheduled reset).
  reset() {
    this.metrics.clear();
  }
}

// Singleton instance shared across all modules.
export const perfMonitor = new PerfMonitor();
