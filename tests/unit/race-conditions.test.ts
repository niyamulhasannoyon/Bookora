import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBookingWithTransaction } from "@/lib/booking-transactions";

const mockService = {
  id: "svc-popular",
  organizationId: "org-salon",
  name: "Popular Hair Cut",
  price: 5000,
  currency: "usd",
  bufferBefore: 0,
  bufferAfter: 0,
  isActive: true,
};

const existingBookings: any[] = [];
let lockQueue: Promise<any> = Promise.resolve();

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(async (cb: any) => {
      // Enforce sequential execution for database transactions simulating serializable isolation / row lock
      const nextTask = lockQueue.then(async () => {
        const txMock = {
          service: {
            findFirst: vi.fn().mockResolvedValue(mockService),
          },
          booking: {
            findMany: vi.fn(({ where }: any) => {
              return existingBookings.filter((b) => {
                const matchesOrg = b.organizationId === where.organizationId;
                const notCancelled = b.status !== "CANCELLED";
                let overlaps = true;
                if (where.AND && Array.isArray(where.AND)) {
                  const ltCondition = where.AND.find((c: any) => c.startAt?.lt);
                  const gtCondition = where.AND.find((c: any) => c.endAt?.gt);
                  if (ltCondition && gtCondition) {
                    const bufferedEndAt = ltCondition.startAt.lt;
                    const bufferedStartAt = gtCondition.endAt.gt;
                    overlaps = b.startAt < bufferedEndAt && b.endAt > bufferedStartAt;
                  }
                }
                return matchesOrg && notCancelled && overlaps;
              });
            }),
            create: vi.fn(({ data }: any) => {
              const created = { id: `b-${Date.now()}-${Math.random()}`, ...data, createdAt: new Date() };
              existingBookings.push(created);
              return created;
            }),
          },
          payment: {
            create: vi.fn(({ data }: any) => ({ id: `p-${Date.now()}`, ...data })),
          },
          notification: {
            create: vi.fn(({ data }: any) => ({ id: `n-${Date.now()}`, ...data })),
          },
        };
        return cb(txMock);
      });

      lockQueue = nextTask.catch(() => {});
      return nextTask;
    }),
  },
}));

describe("Simultaneous Booking Attempt Race Condition Tests", () => {
  beforeEach(() => {
    existingBookings.length = 0;
    lockQueue = Promise.resolve();
    vi.clearAllMocks();
  });

  it("handles 5 simultaneous booking requests for the exact same slot, guaranteeing exactly 1 success and 4 rejections", async () => {
    const startAt = new Date("2026-08-10T14:00:00Z");
    const endAt = new Date("2026-08-10T14:30:00Z");

    const requests = Array.from({ length: 5 }).map((_, idx) =>
      createBookingWithTransaction({
        organizationId: "org-salon",
        serviceId: "svc-popular",
        customerName: `Concurrent Customer ${idx + 1}`,
        customerEmail: `customer${idx + 1}@example.com`,
        startAt,
        endAt,
      })
    );

    const results = await Promise.allSettled(requests);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(4);

    rejected.forEach((rej: any) => {
      expect(rej.reason.message).toBe("The selected time slot is no longer available.");
    });

    expect(existingBookings.length).toBe(1);
    expect(existingBookings[0].customerEmail).toMatch(/customer[1-5]@example.com/);
  });
});
