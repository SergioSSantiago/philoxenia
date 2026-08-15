import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  createAuthChallenge,
  verifyAuthSignature,
  toUserResponse,
} from "../services/auth.js";
import * as social from "../services/social.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { userId: string };
    user: { userId: string };
  }
}

export async function registerRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok" }));

  app.post("/auth/challenge", async (request, reply) => {
    const body = z
      .object({ walletAddress: z.string().min(1) })
      .parse(request.body);

    const challenge = await createAuthChallenge(body.walletAddress);
    return reply.send(challenge);
  });

  app.post("/auth/verify", async (request, reply) => {
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
      if (!user) return reply.status(404).send({ error: "User not found" });
      return reply.send(user);
    }
  );

  app.patch(
    "/users/me",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = z
        .object({
          displayName: z.string().min(1).max(64),
        })
        .parse(request.body);

      try {
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
    async (request) => {
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
        return reply.status(404).send({ error: "Listing unavailable." });
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
        const message = err instanceof Error ? err.message : "Share failed";
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
      return reply.status(404).send({ error: "Invitation unavailable." });
    }
  });

  app.post(
    "/bookings",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = z
        .object({
          listingId: z.string().uuid(),
          checkIn: z.string(),
          checkOut: z.string(),
        })
        .parse(request.body);

      try {
        const booking = await social.createBooking(
          request.user.userId,
          body
        );
        return reply.status(201).send(booking);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Booking failed";
        const status = message.includes("unavailable") ? 404 : 400;
        return reply.status(status).send({ error: message });
      }
    }
  );

  app.get(
    "/bookings",
    { preHandler: [authenticate] },
    async (request) => {
      return social.getMyBookings(request.user.userId);
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
        return reply.status(404).send({ error: "Booking not found" });
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
        const message = err instanceof Error ? err.message : "Payment failed";
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
        const message = err instanceof Error ? err.message : "Settle failed";
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
        const message = err instanceof Error ? err.message : "Refund failed";
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
}

const createListingSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  location: z.string().min(1),
  pricePerNight: z.string().min(1),
  paymentAsset: z.enum(["STRK", "DAI"]),
  minStay: z.number().int().min(1),
  maxStay: z.number().int().min(1),
  cancellationTerms: z.string().min(1),
  connectorRewardPercent: z.number().int().min(0).max(100),
  photos: z.array(z.string()).default([]),
  availability: z
    .array(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .default([]),
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
