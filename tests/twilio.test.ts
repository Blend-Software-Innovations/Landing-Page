import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getTwilioSid, getTwilioAuth, getTwilioPhone, twilioConfigured } from "../lib/twilio";

const KEYS = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
  "TWILIO_SID",
  "TWILIO_AUTH",
  "TWILIO_PHONE"
];

const saved: Record<string, string | undefined> = {};
beforeEach(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("Twilio env resolution", () => {
  it("reads Twilio's own names — the ones the console gives you", () => {
    process.env.TWILIO_ACCOUNT_SID = "ACofficial";
    process.env.TWILIO_AUTH_TOKEN = "official-token";
    process.env.TWILIO_PHONE_NUMBER = "+15550000001";
    expect(getTwilioSid()).toBe("ACofficial");
    expect(getTwilioAuth()).toBe("official-token");
    expect(getTwilioPhone()).toBe("+15550000001");
    expect(twilioConfigured()).toBe(true);
  });

  it("still reads the legacy short names so an existing deployment keeps working", () => {
    process.env.TWILIO_SID = "AClegacy";
    process.env.TWILIO_AUTH = "legacy-token";
    process.env.TWILIO_PHONE = "+15550000002";
    expect(getTwilioSid()).toBe("AClegacy");
    expect(getTwilioAuth()).toBe("legacy-token");
    expect(getTwilioPhone()).toBe("+15550000002");
    expect(twilioConfigured()).toBe(true);
  });

  it("prefers the official name when both are set", () => {
    process.env.TWILIO_ACCOUNT_SID = "ACofficial";
    process.env.TWILIO_SID = "AClegacy";
    expect(getTwilioSid()).toBe("ACofficial");
  });

  it("falls through a blank official value to the legacy one", () => {
    // A variable created in the dashboard and left empty arrives as "" — that
    // must not shadow a working legacy value.
    process.env.TWILIO_ACCOUNT_SID = "";
    process.env.TWILIO_SID = "AClegacy";
    expect(getTwilioSid()).toBe("AClegacy");
  });

  it("trims whitespace, which is easy to paste in from a dashboard", () => {
    process.env.TWILIO_ACCOUNT_SID = "  ACspaced  ";
    expect(getTwilioSid()).toBe("ACspaced");
  });

  it("reports unconfigured when any of the three is missing", () => {
    expect(twilioConfigured()).toBe(false);
    process.env.TWILIO_ACCOUNT_SID = "ACx";
    expect(twilioConfigured()).toBe(false);
    process.env.TWILIO_AUTH_TOKEN = "tok";
    // This is the state the deployment was actually in: credentials present
    // under one spelling, the phone number under another that was not read.
    expect(twilioConfigured()).toBe(false);
    process.env.TWILIO_PHONE_NUMBER = "+15550000003";
    expect(twilioConfigured()).toBe(true);
  });

  it("covers the exact historical misconfiguration", () => {
    // Live app had the official names; the code read only the short ones, so
    // twilioConfigured() was false and every SMS silently did not send.
    process.env.TWILIO_ACCOUNT_SID = "ACreal";
    process.env.TWILIO_AUTH_TOKEN = "real-token";
    process.env.TWILIO_PHONE_NUMBER = "+8801700000000";
    expect(twilioConfigured()).toBe(true);
  });
});
