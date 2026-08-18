import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  createAuthChallenge,
  verifyAuthSignature,
  toUserResponse,
} from "../services/auth.js";
import * as social from "../services/social.js";
import * as notifications from "../services/notifications.js";
import * as chat from "../services/chat.js";
import { getStrkPerDai } from "../services/rates.js";
import { getNetworkStats } from "../services/stats.js";
import { writeAuditLog } from "../lib/audit.js";
import { clientIp, rateLimitCheck } from "../lib/rate-limit.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { userId: string };
    user: { userId: string };
  }
}

function enforceRateLimit(
  request: FastifyRequest,
  reply: FastifyReply,
  bucket: string,
  limit: number,
  windowMs: number
) {
  const ip = clientIp(
    request.headers as Record<string, unknown>,
    request.ip ?? "unknown"
  );
  const check = rateLimitCheck(`${bucket}:${ip}`, limit, windowMs);
  if (!check.ok) {
    void writeAuditLog({
      action: "rate_limit.hit",
      meta: { bucket, ip },
      request,
    });
    return reply
      .status(429)
      .header("Retry-After", String(check.retryAfterSec))
      .send({ error: "Too many requests — try again shortly" });
  }
  return null;
}

export async function registerRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok" }));

  app.get("/stats/network", async () => getNetworkStats());

  app.get("/rates/strk-dai", async (request) => {
    const q = z
      .object({ fresh: z.enum(["1", "true"]).optional() })
      .parse(request.query ?? {});
    return getStrkPerDai({ fresh: Boolean(q.fresh) });
  });

  app.post("/auth/challenge", async (request, reply) => {
    const limited = enforceRateLimit(request, reply, "auth.challenge", 20, 60_000);
    if (limited) return limited;

    const body = z
      .object({ walletAddress: z.string().min(1) })
      .parse(request.body);

    const challenge = await createAuthChallenge(body.walletAddress);
    return reply.send(challenge);
  });

  app.post("/auth/verify", async (request, reply) => {
    const limited = enforceRateLimit(request, reply, "auth.verify", 15, 60_000);
    if (limited) return limited;

    const body = z
      .object({
        walletAddress: z.string().min(1),
        signature: z.array(z.string()).min(2),
        displayName: z.string().optional(),
      })
      .parse(request.body);

    try {
      const user = await verifyAuthSignature(
        body.walletAddress,
        body.signature,
        body.displayName
      );

      const token = app.jwt.sign({ userId: user.id }, { expiresIn: "7d" });

      return reply.send({
        token,
        user: toUserResponse(user),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      return reply.status(401).send({ error: message });
    }
  });

  app.get(
    "/auth/me",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user.userId;
      const user = await social.getUserById(userId);
      if (!user) return reply.status(404).send({ error: "Saved Ready X session is invalid. Connect Ready X again." });
      return reply.send(user);
    }
  );

  app.patch(
    "/users/me",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = z
        .object({
          displayName: z.string().min(1).max(64).optional(),
          messagePublicKey: z.string().min(16).max(512).optional(),
        })
        .parse(request.body);

      try {
        if (body.messagePublicKey) {
          const user = await social.updateUserMessagePublicKey(
            request.user.userId,
            body.messagePublicKey
          );
          if (body.displayName) {
            return reply.send(
              await social.updateUserDisplayName(
                request.user.userId,
                body.displayName
              )
            );
          }
          return reply.send(user);
        }
        if (!body.displayName) {
          return reply.status(400).send({ error: "Nothing to update" });
        }
        const user = await social.updateUserDisplayName(
          request.user.userId,
          body.displayName
        );
        return reply.send(user);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update profile";
        return reply.status(400).send({ error: message });
      }
    }
  );

  app.get("/home", { preHandler: [authenticate] }, async (request) => {
    return social.getHomeData(request.user.userId);
  });

  app.get("/friends", { preHandler: [authenticate] }, async (request) => {
    return social.getFriendsData(request.user.userId);
  });

  app.get(
    "/friends/search",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const limited = enforceRateLimit(
        request,
        reply,
        "friends.search",
        40,
        60_000
      );
      if (limited) return limited;

      const query = z
        .object({ q: z.string() })
        .parse(request.query);
      return social.searchUsers(query.q, request.user.userId);
    }
  );

  app.post(
    "/friends/request",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = z
        .object({ toUserId: z.string().uuid() })
        .parse(request.body);

      try {
        const result = await social.sendFriendRequest(
          request.user.userId,
          body.toUserId
        );
        return reply.send(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Request failed";
        return reply.status(400).send({ error: message });
      }
    }
  );

  app.post(
    "/friends/accept/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = z
        .object({ id: z.string().uuid() })
        .parse(request.params);

      try {
        return await social.acceptFriendRequest(
          params.id,
          request.user.userId
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Request failed";
        return reply.status(400).send({ error: message });
      }
    }
  );

  app.post(
    "/friends/reject/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = z
        .object({ id: z.string().uuid() })
        .parse(request.params);

      try {
        return await social.rejectFriendRequest(
          params.id,
          request.user.userId
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Request failed";
        return reply.status(400).send({ error: message });
      }
    }
  );

  app.post(
    "/friends/cancel/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = z
        .object({ id: z.string().uuid() })
        .parse(request.params);

      try {
        return await social.cancelFriendRequest(
          params.id,
          request.user.userId
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Request failed";
        return reply.status(400).send({ error: message });
      }
    }
  );

  app.post(
    "/friends/remove/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = z
        .object({ id: z.string().uuid() })
        .parse(request.params);

      try {
        return await social.removeFriend(request.user.userId, params.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Request failed";
        return reply.status(400).send({ error: message });
      }
    }
  );

  app.get(
    "/friends/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = z
        .object({ id: z.string().uuid() })
        .parse(request.params);

      try {
        return await social.getFriendProfile(
          request.user.userId,
          params.id
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Request failed";
        const status = message.includes("not found")
          ? 404
          : message.includes("Not friends")
            ? 403
            : 400;
        return reply.status(status).send({ error: message });
      }
    }
  );

  app.get(
    "/notifications",
    { preHandler: [authenticate] },
    async (request) => {
      const [items, unreadCount] = await Promise.all([
        notifications.listNotifications(request.user.userId),
        notifications.unreadNotificationCount(request.user.userId),
      ]);
      return { items, unreadCount };
    }
  );

  app.post(
    "/notifications/read-all",
    { preHandler: [authenticate] },
    async (request) => {
      return notifications.markAllNotificationsRead(request.user.userId);
    }
  );

  app.post(
    "/notifications/:id/read",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = z
        .object({ id: z.string().uuid() })
        .parse(request.params);
      const row = await notifications.markNotificationRead(
        params.id,
        request.user.userId
      );
      if (!row) return reply.status(404).send({ error: "Not found" });
      return row;
    }
  );

  app.delete(
    "/friends/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = z
        .object({ id: z.string().uuid() })
        .parse(request.params);

      try {
        return await social.removeFriend(request.user.userId, params.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Request failed";
        return reply.status(400).send({ error: message });
      }
    }
  );

  app.post(
    "/my-listings",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = createListingSchema.parse(request.body);

      try {
        const listing = await social.createListing(
          request.user.userId,
          body
        );
        return reply.status(201).send(listing);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Create failed";
        return reply.status(400).send({ error: message });
      }
    }
  );

  app.get(
    "/my-listings",
    { preHandler: [authenticate] },
    async (request) => {
      return social.getMyListings(request.user.userId);
    }
  );

  app.delete(
    "/my-listings/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const params = z
          .object({ id: z.string().uuid() })
          .parse(request.params);
        return await social.deleteListing(params.id, request.user.userId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Delete this place failed";
        const status = message.includes("unavailable") ? 404 : 400;
        return reply.status(status).send({ error: message });
      }
    }
  );

  app.patch(
    "/my-listings/:id/availability",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = z
        .object({ id: z.string().uuid() })
        .parse(request.params);
      const body = z
        .object({
          availability: z
            .array(
              z.object({
                startDate: z.string(),
                endDate: z.string(),
              })
            )
            .optional(),
          days: z
            .array(
              z.object({
                day: z.string(),
                pricePerNight: z.string().min(1),
              })
            )
            .optional(),
        })
        .parse(request.body);

      try {
        if (body.days) {
          return await social.setListingAvailableDays(
            params.id,
            request.user.userId,
            body.days
          );
        }
        if (body.availability) {
          return await social.updateListingAvailability(
            params.id,
            request.user.userId,
            body.availability
          );
        }
        return reply
          .status(400)
          .send({ error: "Provide days or availability" });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Update availability failed";
        return reply.status(400).send({ error: message });
      }
    }
  );

  app.get(
    "/my-network/listings",
    { preHandler: [authenticate] },
    async (request) => {
      return social.getNetworkListings(request.user.userId);
    }
  );

  app.get(
    "/shared-listings",
    { preHandler: [authenticate] },
    async (request) => {
      return social.getSharedWithMeListings(request.user.userId);
    }
  );

  app.get(
    "/listings/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = z
        .object({ id: z.string().uuid() })
        .parse(request.params);

      try {
        return await social.getListingForViewer(
          params.id,
          request.user.userId
        );
      } catch {
        return reply.status(404).send({ error: "This place isn’t available to Book & pay." });
      }
    }
  );

  app.post(
    "/listings/:id/share",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = z
        .object({ id: z.string().uuid() })
        .parse(request.params);

      try {
        return await social.createListingShare(
          params.id,
          request.user.userId
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not share this place";
        const status = message.includes("unavailable") ? 404 : 403;
        return reply.status(status).send({ error: message });
      }
    }
  );

  app.get("/invite/:token", async (request, reply) => {
    const params = z
      .object({ token: z.string().min(1) })
      .parse(request.params);

    const guestId = tryGetUserId(request);

    try {
      return await social.resolveInvite(params.token, guestId ?? undefined);
    } catch {
      return reply.status(404).send({
        error: "This place invite isn’t available to Book & pay.",
      });
    }
  });

  app.post(
    "/bookings/quote",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = z
        .object({
          listingId: z.string().uuid(),
          nights: z.array(z.string()).min(1).optional(),
          checkIn: z.string().optional(),
          checkOut: z.string().optional(),
          paymentAsset: z.enum(["STRK", "DAI"]).optional(),
        })
        .parse(request.body);

      try {
        return await social.quoteBooking(request.user.userId, body);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Quote failed";
        const status = message.includes("unavailable") ? 404 : 400;
        return reply.status(status).send({ error: message });
      }
    }
  );

  app.post(
    "/bookings/confirm",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = z
        .object({
          bookingId: z.string().uuid(),
          listingId: z.string().uuid(),
          nights: z.array(z.string()).min(1).optional(),
          checkIn: z.string().optional(),
          checkOut: z.string().optional(),
          fundTxHash: z.string().min(1),
          escrowBookingId: z.string().min(1),
          privacyMode: z.enum(["private", "public"]).optional(),
          paymentAsset: z.enum(["STRK", "DAI"]).optional(),
          totalPrice: z.string().optional(),
          totalPriceStrk: z.string().optional(),
          fxRate: z.string().optional(),
        })
        .parse(request.body);

      try {
        const booking = await social.confirmPaidBooking(
          request.user.userId,
          body
        );
        return reply.status(201).send(booking);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Confirm booking failed";
        const status =
          /unavailable/i.test(message)
            ? 404
            : /not found on Starknet|did not succeed|no BookingSettled|already used/i.test(
                  message
                )
              ? 400
              : 400;
        return reply.status(status).send({ error: message });
      }
    }
  );

  app.post(
    "/bookings/inspect-payment",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = z
        .object({
          fundTxHash: z.string().min(1),
        })
        .parse(request.body);

      try {
        return await social.inspectPaidBookingTx(
          request.user.userId,
          body.fundTxHash
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not read payment";
        const status = /unavailable/i.test(message) ? 404 : 400;
        return reply.status(status).send({ error: message });
      }
    }
  );

  app.post(
    "/bookings/recover",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = z
        .object({
          fundTxHash: z.string().min(1),
          nights: z.array(z.string()).min(1),
          listingId: z.string().uuid().optional(),
          privacyMode: z.enum(["private", "public"]).optional(),
        })
        .parse(request.body);

      try {
        const booking = await social.recoverPaidBooking(
          request.user.userId,
          body
        );
        return reply.status(201).send(booking);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Recover booking failed";
        const status = /unavailable/i.test(message) ? 404 : 400;
        return reply.status(status).send({ error: message });
      }
    }
  );

  app.post(
    "/bookings",
    { preHandler: [authenticate] },
    async (_request, reply) => {
      return reply.status(400).send({
        error:
          "Bookings are created only after payment. Use POST /bookings/quote, pay on-chain, then POST /bookings/confirm.",
      });
    }
  );

  app.get(
    "/bookings",
    { preHandler: [authenticate] },
    async (request) => {
      try {
        return await social.recoverMinePaidBookings(request.user.userId);
      } catch {
        return social.getMyBookings(request.user.userId);
      }
    }
  );

  app.post(
    "/bookings/recover-mine",
    { preHandler: [authenticate] },
    async (request) => {
      try {
        return await social.recoverMinePaidBookings(request.user.userId);
      } catch {
        return social.getMyBookings(request.user.userId);
      }
    }
  );

  app.get(
    "/bookings/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = z
        .object({ id: z.string().uuid() })
        .parse(request.params);

      try {
        return await social.getBookingById(params.id, request.user.userId);
      } catch {
        return reply.status(404).send({
          error: "This stay isn’t available to Book & pay.",
        });
      }
    }
  );

  app.post(
    "/bookings/:id/fund",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = z
        .object({ id: z.string().uuid() })
        .parse(request.params);
      const body = z
        .object({
          fundTxHash: z.string().min(1),
          escrowBookingId: z.string().optional(),
          privacyMode: z.enum(["private", "public"]).optional(),
        })
        .parse(request.body);

      try {
        return await social.updateBookingPayment(
          params.id,
          request.user.userId,
          body
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not record this Book & pay";
        return reply.status(400).send({ error: message });
      }
    }
  );

  app.post(
    "/bookings/:id/settle",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = z
        .object({ id: z.string().uuid() })
        .parse(request.params);
      const body = z
        .object({ settleTxHash: z.string().min(1) })
        .parse(request.body);

      try {
        return await social.settleBooking(
          params.id,
          request.user.userId,
          body
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not settle this Book & pay stay";
        return reply.status(400).send({ error: message });
      }
    }
  );

  app.post(
    "/bookings/:id/refund",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = z
        .object({ id: z.string().uuid() })
        .parse(request.params);
      const body = z
        .object({ refundTxHash: z.string().min(1) })
        .parse(request.body);

      try {
        return await social.refundBooking(
          params.id,
          request.user.userId,
          body
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not refund this Book & pay stay";
        return reply.status(400).send({ error: message });
      }
    }
  );

  app.post(
    "/bookings/:id/cancel-request",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = z
        .object({ id: z.string().uuid() })
        .parse(request.params);
      try {
        return await social.socialCancelBooking(
          params.id,
          request.user.userId
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Cancel failed";
        return reply.status(400).send({ error: message });
      }
    }
  );

  app.post(
    "/bookings/:id/social-cancel",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const params = z
        .object({ id: z.string().uuid() })
        .parse(request.params);
      try {
        return await social.socialCancelBooking(
          params.id,
          request.user.userId
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Cancel failed";
        return reply.status(400).send({ error: message });
      }
    }
  );

  app.get(
    "/connector/earnings",
    { preHandler: [authenticate] },
    async (request) => {
      return social.getConnectorEarnings(request.user.userId);
    }
  );

  app.get("/messages", { preHandler: [authenticate] }, async (request) => {
    return chat.listMessageThreads(request.user.userId);
  });

  app.get(
    "/messages/:friendId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { friendId } = request.params as { friendId: string };
      try {
        return await chat.getConversation(request.user.userId, friendId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "This chat isn’t available";
        return reply.status(400).send({ error: message });
      }
    }
  );

  app.post(
    "/messages/:friendId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { friendId } = request.params as { friendId: string };
      const body = z
        .object({ body: z.string().min(1).max(8000) })
        .parse(request.body);
      try {
        return await chat.sendTextMessage(
          request.user.userId,
          friendId,
          body.body
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Send failed";
        return reply.status(400).send({ error: message });
      }
    }
  );

  app.post(
    "/messages/:friendId/transfer",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { friendId } = request.params as { friendId: string };
      const body = z
        .object({
          amount: z.string().min(1),
          asset: z.enum(["STRK", "DAI"]),
          txHash: z.string().min(10),
          privacyMode: z.enum(["private", "public"]).optional(),
        })
        .parse(request.body);
      try {
        return await chat.recordTransferMessage(
          request.user.userId,
          friendId,
          body
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Transfer record failed";
        return reply.status(400).send({ error: message });
      }
    }
  );
}

const createListingSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().min(1),
    location: z.string().min(1).max(300),
    locationLat: z.number().min(-90).max(90),
    locationLng: z.number().min(-180).max(180),
    pricePerNight: z.string().min(1),
    paymentAsset: z.enum(["STRK", "DAI"]).optional(),
    minStay: z.number().int().min(1).optional(),
    maxStay: z.number().int().min(1).optional(),
    cancellationTerms: z.string().min(1).max(2000),
    connectorRewardPercent: z.number().int().min(0).max(100),
    photos: z.array(z.string().min(1)).min(1).max(8),
    availableDays: z
      .array(
        z.object({
          day: z.string().min(1),
          pricePerNight: z.string().min(1),
        })
      )
      .optional(),
    availability: z
      .array(
        z.object({
          startDate: z.string(),
          endDate: z.string(),
        })
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    const hasDays = (data.availableDays?.length ?? 0) > 0;
    const hasWindows = (data.availability?.length ?? 0) > 0;
    if (!hasDays && !hasWindows) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one available night",
        path: ["availableDays"],
      });
    }
    if (data.availability) {
      for (let i = 0; i < data.availability.length; i++) {
        const start = new Date(data.availability[i].startDate);
        const end = new Date(data.availability[i].endDate);
        if (!(end > start)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Availability end must be after start",
            path: ["availability", i, "endDate"],
          });
        }
      }
    }
  });

async function authenticate(request: FastifyRequest) {
  try {
    await request.jwtVerify();
  } catch {
    throw new Error("Unauthorized");
  }
}

function tryGetUserId(request: FastifyRequest): string | null {
  const auth = request.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;

  try {
    const decoded = request.server.jwt.verify<{ userId: string }>(
      auth.slice(7)
    );
    return decoded.userId;
  } catch {
    return null;
  }
}
