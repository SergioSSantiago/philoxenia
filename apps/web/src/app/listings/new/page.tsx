"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell, Button, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

export default function CreateListingPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    pricePerNight: "",
    paymentAsset: "STRK" as "STRK" | "DAI",
    minStay: 1,
    maxStay: 30,
    cancellationTerms: "Full refund if cancelled 7 days before check-in.",
    connectorRewardPercent: 5,
    photos: [""],
    availabilityStart: "",
    availabilityEnd: "",
  });

  useEffect(() => {
    if (!token) router.replace("/home");
  }, [token, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const listing = await api.post<{ id: string }>("/my-listings", {
        ...form,
        photos: form.photos.filter(Boolean),
        availability:
          form.availabilityStart && form.availabilityEnd
            ? [
                {
                  startDate: form.availabilityStart,
                  endDate: form.availabilityEnd,
                },
              ]
            : [],
      });
      router.push(`/listings/${listing.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  }

  const field = (
    key: keyof typeof form,
    label: string,
    type = "text",
    props: Record<string, unknown> = {}
  ) => (
    <label className="block text-sm">
      {label}
      <input
        type={type}
        className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5"
        value={String(form[key])}
        onChange={(e) =>
          setForm((f) => ({
            ...f,
            [key]:
              type === "number" ? Number(e.target.value) : e.target.value,
          }))
        }
        {...props}
      />
    </label>
  );

  return (
    <Shell>
      <h1 className="text-4xl mb-8">List your place</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          {field("title", "Title")}
          {field("description", "Description")}
          {field("location", "Location (e.g. Florence, Italy)")}
          {field("pricePerNight", "Price per night", "number", { step: "0.01" })}

          <label className="block text-sm">
            Payment asset
            <select
              className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5"
              value={form.paymentAsset}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  paymentAsset: e.target.value as "STRK" | "DAI",
                }))
              }
            >
              <option value="STRK">STRK</option>
              <option value="DAI">DAI</option>
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            {field("minStay", "Minimum stay (nights)", "number")}
            {field("maxStay", "Maximum stay (nights)", "number")}
          </div>

          {field("connectorRewardPercent", "Connector reward (%)", "number", {
            min: 0,
            max: 100,
          })}

          {field("cancellationTerms", "Cancellation terms")}
          {field("photos.0" as keyof typeof form, "Photo URL")}

          <div className="grid gap-4 sm:grid-cols-2">
            {field("availabilityStart", "Available from", "date")}
            {field("availabilityEnd", "Available until", "date")}
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create listing"}
          </Button>
        </form>
      </Card>
    </Shell>
  );
}
