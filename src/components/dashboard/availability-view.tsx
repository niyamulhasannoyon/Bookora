"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Save,
  Globe,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  updateWeeklyAvailabilityAction,
  createAvailabilityOverrideAction,
  deleteAvailabilityOverrideAction,
} from "@/actions/availability";
import { DayOfWeek } from "@/types";

interface WeeklySlot {
  id?: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isClosed: boolean;
}

interface OverrideSlot {
  id: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  isAvailable: boolean;
}

interface AvailabilityViewProps {
  initialAvailabilities: WeeklySlot[];
  initialOverrides: OverrideSlot[];
  timezone: string;
}

const ALL_DAYS: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export function AvailabilityView({
  initialAvailabilities,
  initialOverrides,
  timezone,
}: AvailabilityViewProps) {
  const router = useRouter();

  // Merge initial availabilities with default 9am-5pm for missing days
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySlot[]>(() => {
    return ALL_DAYS.map((day) => {
      const existing = initialAvailabilities.find((a) => a.dayOfWeek === day);
      if (existing) return existing;
      return {
        dayOfWeek: day,
        startTime: "09:00",
        endTime: "17:00",
        isClosed: day === "SUNDAY",
      };
    });
  });

  const [overrides, setOverrides] = useState<OverrideSlot[]>(initialOverrides);
  const [savingDay, setSavingDay] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New Override Form State
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideIsAvailable, setOverrideIsAvailable] = useState(false);
  const [overrideStart, setOverrideStart] = useState("09:00");
  const [overrideEnd, setOverrideEnd] = useState("17:00");
  const [addingOverride, setAddingOverride] = useState(false);

  const handleScheduleChange = (
    day: DayOfWeek,
    field: keyof WeeklySlot,
    value: any
  ) => {
    setWeeklySchedule((prev) =>
      prev.map((item) => (item.dayOfWeek === day ? { ...item, [field]: value } : item))
    );
  };

  const saveDaySchedule = async (slot: WeeklySlot) => {
    setSavingDay(slot.dayOfWeek);
    setSuccessMessage(null);
    const res = await updateWeeklyAvailabilityAction(
      slot.dayOfWeek,
      slot.startTime,
      slot.endTime,
      slot.isClosed
    );
    setSavingDay(null);
    if (res.success) {
      setSuccessMessage(`Updated availability for ${slot.dayOfWeek}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      router.refresh();
    } else {
      alert(res.error || "Failed to update availability");
    }
  };

  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideDate) return;

    setAddingOverride(true);
    const res = await createAvailabilityOverrideAction(
      overrideDate,
      overrideIsAvailable ? overrideStart : undefined,
      overrideIsAvailable ? overrideEnd : undefined,
      overrideIsAvailable
    );
    setAddingOverride(false);

    if (res.success && res.data) {
      setOverrides((prev) => [
        ...prev,
        {
          id: res.data.id,
          date: new Date(res.data.date).toISOString(),
          startTime: res.data.startTime,
          endTime: res.data.endTime,
          isAvailable: res.data.isAvailable,
        },
      ]);
      setOverrideDate("");
      setSuccessMessage("Added date override successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
      router.refresh();
    } else {
      alert(res.error || "Failed to create date override.");
    }
  };

  const handleDeleteOverride = async (id: string) => {
    const res = await deleteAvailabilityOverrideAction(id);
    if (res.success) {
      setOverrides((prev) => prev.filter((o) => o.id !== id));
      router.refresh();
    } else {
      alert(res.error || "Failed to delete override.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Availability & Working Hours
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Define recurring weekly operating hours and specific holiday overrides.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300">
          <Globe className="h-4 w-4 text-violet-400" />
          <span>Timezone: <strong className="text-white">{timezone}</strong></span>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Weekly Operating Hours Card */}
      <Card className="bg-slate-900/60 border border-slate-800 shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-400" />
            Weekly Recurring Schedule
          </CardTitle>
          <CardDescription>
            Configure business open and closed hours for each day of the week.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="divide-y divide-slate-800/80">
            {weeklySchedule.map((slot) => {
              const isSaving = savingDay === slot.dayOfWeek;

              return (
                <div
                  key={slot.dayOfWeek}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="w-36 font-semibold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                    {slot.dayOfWeek}
                  </div>

                  {/* Hours Inputs or Closed Toggle */}
                  <div className="flex flex-wrap items-center gap-3 flex-1">
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={slot.isClosed}
                        onChange={(e) =>
                          handleScheduleChange(slot.dayOfWeek, "isClosed", e.target.checked)
                        }
                        className="rounded border-slate-700 text-violet-600 focus:ring-violet-500/30"
                      />
                      <span>Closed</span>
                    </label>

                    {!slot.isClosed ? (
                      <div className="flex items-center gap-2 text-xs">
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) =>
                            handleScheduleChange(slot.dayOfWeek, "startTime", e.target.value)
                          }
                          className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-violet-500"
                        />
                        <span className="text-slate-500">to</span>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) =>
                            handleScheduleChange(slot.dayOfWeek, "endTime", e.target.value)
                          }
                          className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-violet-500"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Day Off / Store Closed</span>
                    )}
                  </div>

                  {/* Save Button */}
                  <Button
                    size="sm"
                    disabled={isSaving}
                    onClick={() => saveDaySchedule(slot)}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs gap-1.5 self-end sm:self-auto"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{isSaving ? "Saving..." : "Save"}</span>
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Date Overrides Section */}
      <Card className="bg-slate-900/60 border border-slate-800 shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-violet-400" />
            Date Overrides (Holidays & Special Hours)
          </CardTitle>
          <CardDescription>
            Override your weekly schedule for specific dates like national holidays or extended hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Override Form */}
          <form onSubmit={handleAddOverride} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
            <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Add Specific Date Override</h4>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-slate-400 block mb-1">Select Date</label>
                <input
                  type="date"
                  required
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overrideIsAvailable}
                    onChange={(e) => setOverrideIsAvailable(e.target.checked)}
                    className="rounded border-slate-700 text-violet-600 focus:ring-violet-500/30"
                  />
                  <span>Open for Bookings</span>
                </label>
              </div>

              {overrideIsAvailable && (
                <div className="flex items-center gap-2 pt-5 text-xs">
                  <input
                    type="time"
                    value={overrideStart}
                    onChange={(e) => setOverrideStart(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs"
                  />
                  <span className="text-slate-500">to</span>
                  <input
                    type="time"
                    value={overrideEnd}
                    onChange={(e) => setOverrideEnd(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs"
                  />
                </div>
              )}

              <div className="pt-5 ml-auto">
                <Button type="submit" disabled={addingOverride} className="bg-violet-600 hover:bg-violet-500 text-white text-xs gap-1.5">
                  <Plus className="h-4 w-4" />
                  <span>{addingOverride ? "Adding..." : "Add Override"}</span>
                </Button>
              </div>
            </div>
          </form>

          {/* Overrides Table */}
          {overrides.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No active date overrides set.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-slate-400 text-xs uppercase font-semibold">
                  <tr>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Custom Hours</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {overrides.map((o) => {
                    const d = new Date(o.date);
                    return (
                      <tr key={o.id} className="hover:bg-slate-800/40">
                        <td className="py-3 font-semibold text-white">
                          {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              o.isAvailable
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {o.isAvailable ? "OPEN" : "HOLIDAY / CLOSED"}
                          </span>
                        </td>
                        <td className="py-3 text-xs font-mono text-slate-300">
                          {o.isAvailable && o.startTime && o.endTime
                            ? `${o.startTime} - ${o.endTime}`
                            : "Full Day Closed"}
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteOverride(o.id)}
                            className="text-rose-400 hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
