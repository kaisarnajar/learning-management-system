import { beforeEach, describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { POST as login } from "@/app/api/v1/auth/login/route";
import { POST as google } from "@/app/api/v1/auth/google/route";
import { POST as mobileRegister } from "@/app/api/v1/auth/register/route";
import { POST as enroll } from "@/app/api/v1/enrollments/route";
import { POST as askFatwa } from "@/app/api/v1/fatwa/route";
import { PATCH as markNotification } from "@/app/api/v1/notifications/route";
import { DELETE as removeDeviceToken, POST as addDeviceToken } from "@/app/api/v1/notifications/device-token/route";
import { POST as review } from "@/app/api/v1/reviews/route";
import { POST as submitPayment } from "@/app/api/v1/payments/submit/route";
import { POST as orderBooks } from "@/app/api/v1/bookstore/orders/route";
import { POST as webRegister } from "@/app/api/auth/register/route";
import { POST as forgotPassword } from "@/app/api/auth/forgot-password/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";
import { INVALID_JSON_MESSAGE } from "@/utils/api-response";
import { resetDb, setPaymentSettings, SKIP_WITHOUT_DB } from "../helpers/db";
import { apiRequest, jsonOf, signedInStudent } from "../helpers/api";

type Handler = (request: NextRequest) => Promise<Response>;

/** Routes that read a JSON body; `student` ones need a signed-in student first. */
const ROUTES: Array<{ name: string; path: string; method: string; handler: Handler; student?: boolean; web?: boolean }> = [
  { name: "POST /api/v1/auth/login", path: "/api/v1/auth/login", method: "POST", handler: login },
  { name: "POST /api/v1/auth/google", path: "/api/v1/auth/google", method: "POST", handler: google },
  { name: "POST /api/v1/auth/register", path: "/api/v1/auth/register", method: "POST", handler: mobileRegister },
  { name: "POST /api/v1/enrollments", path: "/api/v1/enrollments", method: "POST", handler: enroll, student: true },
  { name: "POST /api/v1/fatwa", path: "/api/v1/fatwa", method: "POST", handler: askFatwa },
  { name: "PATCH /api/v1/notifications", path: "/api/v1/notifications", method: "PATCH", handler: markNotification, student: true },
  { name: "POST /api/v1/notifications/device-token", path: "/api/v1/notifications/device-token", method: "POST", handler: addDeviceToken, student: true },
  { name: "DELETE /api/v1/notifications/device-token", path: "/api/v1/notifications/device-token", method: "DELETE", handler: removeDeviceToken, student: true },
  { name: "POST /api/v1/reviews", path: "/api/v1/reviews", method: "POST", handler: review, student: true },
  { name: "POST /api/v1/payments/submit", path: "/api/v1/payments/submit", method: "POST", handler: submitPayment, student: true },
  { name: "POST /api/v1/bookstore/orders", path: "/api/v1/bookstore/orders", method: "POST", handler: orderBooks, student: true },
  { name: "POST /api/auth/register", path: "/api/auth/register", method: "POST", handler: webRegister, web: true },
  { name: "POST /api/auth/forgot-password", path: "/api/auth/forgot-password", method: "POST", handler: forgotPassword, web: true },
  { name: "POST /api/auth/reset-password", path: "/api/auth/reset-password", method: "POST", handler: resetPassword, web: true },
];

describe.skipIf(SKIP_WITHOUT_DB)("a body that is not a JSON object", () => {
  beforeEach(async () => {
    await resetDb();
    await setPaymentSettings(); // payments/submit answers 503 before reading the body otherwise
  });

  for (const route of ROUTES) {
    for (const [label, body] of [["malformed JSON", "{bad"], ["a JSON array", "[1,2]"], ["no body", undefined]] as const) {
      it(`${route.name} answers 400 for ${label}`, async () => {
        const headers: Record<string, string> = { "content-type": "application/json" };
        if (route.student) Object.assign(headers, (await signedInStudent()).headers);
        const response = await route.handler(apiRequest(route.path, { method: route.method, headers, body }));
        expect(response.status).toBe(400);
        const json = await jsonOf(response);
        expect(json.error).toBe(INVALID_JSON_MESSAGE);
        if (!route.web) expect(json.success).toBe(false);
      });
    }
  }
});
