import path from "path";
import fs from "fs";

// Configure a clean, isolated local store to prevent state pollution from previous runs
const testStorePath = path.resolve(".", "artifacts", "api-server", "data", "local-store-test.json");
if (fs.existsSync(testStorePath)) {
  try {
    fs.unlinkSync(testStorePath);
  } catch (_) {}
}
process.env["LOCAL_STORE_PATH"] = testStorePath;

import { generateAuthToken } from "../artifacts/api-server/src/lib/authTokens";
import type { Server } from "http";
import crypto from "crypto";

const PORT = 4999;
const BASE_URL = `http://localhost:${PORT}/api`;

// We will simulate 4 types of clients:
// 1. Guest (unauthenticated)
// 2. Normal User (id: 3, role: "user")
// 3. Admin (id: 2, role: "admin")
// 4. Owner (id: 1, role: "owner")

const userToken = generateAuthToken(3);
const adminToken = generateAuthToken(2);
const ownerToken = generateAuthToken(1);

interface TestResult {
  name: string;
  expectedStatus: number | string;
  actualStatus: number | string;
  passed: boolean;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  path: string,
  method: string,
  token: string | null,
  body: any,
  expectedStatus: number
) {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const status = response.status;
    const passed = status === expectedStatus;

    results.push({
      name,
      expectedStatus,
      actualStatus: status,
      passed,
    });
  } catch (err: any) {
    results.push({
      name,
      expectedStatus,
      actualStatus: `Error: ${err.message}`,
      passed: false,
    });
  }
}

// Minimal Base32 decoder for test OTP generation
function decodeBase32(b32: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = b32.toUpperCase().replace(/[\s-]/g, "").replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = alphabet.indexOf(cleaned[i]);
    if (idx === -1) throw new Error("Invalid base32 char");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function getTOTPCode(secret: string): string {
  const time = Math.floor(Date.now() / 1000 / 30);
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(0, 0);
  buffer.writeUInt32BE(time, 4);
  const key = decodeBase32(secret);
  const hmac = crypto.createHmac("sha1", key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const codeInt = hmac.subarray(offset, offset + 4).readUInt32BE(0) & 0x7fffffff;
  return String(codeInt % 1000000).padStart(6, "0");
}

async function startTests() {
  console.log("\n==================================================");
  console.log("🔒 STARTING AUTOMATED SECURITY INTEGRATION TESTS 🔒");
  console.log("==================================================\n");

  const { default: mockApp } = await import("../artifacts/api-server/src/mock-app");

  let server: Server;
  try {
    server = mockApp.listen(PORT);
    console.log(`Test server booted successfully on port ${PORT}.\n`);
  } catch (err) {
    console.error("Failed to boot test server:", err);
    process.exit(1);
  }

  // Pre-seed some mock entities in mock-app arrays for testing:
  // In mock-app:
  // - users list contains: owner (id: 1), admin (id: 2), user (id: 3)
  // Let's seed a support ticket belonging to user id: 3, and one belonging to owner id: 1
  // Seeding is done by calling endpoints as owner / user:
  
  // 1. Create a support ticket for owner (id: 1)
  await fetch(`${BASE_URL}/support/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ownerToken}` },
    body: JSON.stringify({ title: "Owner Ticket", message: "Owner message content" }),
  });

  // 2. Create a support ticket for user (id: 3)
  await fetch(`${BASE_URL}/support/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
    body: JSON.stringify({ title: "User Ticket", message: "User message content" }),
  });

  // 3. Create a wallet deposit request for user (id: 3)
  const depRes = await fetch(`${BASE_URL}/wallet/deposits`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
    body: JSON.stringify({ amount: 50, method: "Orange Money", notes: "Test" }),
  });
  const depData: any = await depRes.json();
  const testDepositId = depData.id || 1;

  // 4. Create an order for user (id: 3)
  const orderRes = await fetch(`${BASE_URL}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
    body: JSON.stringify({ productId: 1, userInputData: { player_id: "12345" } }),
  });
  const orderData: any = await orderRes.json();
  const testOrderId = orderData.id || 1;

  // 5. Create an order for owner (id: 1) to test unauthorized viewing (IDOR)
  const ownerOrderRes = await fetch(`${BASE_URL}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ownerToken}` },
    body: JSON.stringify({ productId: 1, userInputData: { player_id: "owner_999" } }),
  });
  const ownerOrderData: any = await ownerOrderRes.json();
  const ownerOrderId = ownerOrderData.id || 2;

  // Seeding complete. Execute test cases:

  // --- WALLET SECURITY TESTS ---
  await runTest(
    "1. Normal user trying to approve a deposit -> Must fail with 403",
    `/wallet/deposits/${testDepositId}/approve`,
    "POST",
    userToken,
    null,
    403
  );

  await runTest(
    "2. Normal user trying to reject a deposit -> Must fail with 403",
    `/wallet/deposits/${testDepositId}/reject`,
    "POST",
    userToken,
    null,
    403
  );

  await runTest(
    "3. Normal user trying to manually adjust wallet balance -> Must fail with 403",
    "/users/3",
    "PATCH",
    userToken,
    { walletBalance: 9999.00 },
    403
  );

  // --- VERIFICATION SECURITY TESTS ---
  await runTest(
    "4. Normal user trying to view all verifications -> Must fail with 403",
    "/verification/all",
    "GET",
    userToken,
    null,
    403
  );

  await runTest(
    "5. Normal user trying to approve verification request -> Must fail with 403",
    "/verification/1/approve",
    "POST",
    userToken,
    null,
    403
  );

  // --- SUPPORT TICKET SECURITY TESTS ---
  await runTest(
    "6. Normal user trying to read another user's (owner's) support ticket -> Must fail with 403",
    "/support/tickets/1",
    "GET",
    userToken,
    null,
    403
  );

  await runTest(
    "7. Normal user trying to reply to another user's (owner's) support ticket -> Must fail with 403",
    "/support/tickets/1/reply",
    "POST",
    userToken,
    { message: "Hacked reply" },
    403
  );

  // --- ORDERS SECURITY TESTS ---
  await runTest(
    "8. Normal user trying to view another user's order details -> Must fail with 403 (using owner ticket/order id)",
    `/orders/${ownerOrderId}`,
    "GET",
    userToken,
    null,
    403
  );

  await runTest(
    "9. Normal user trying to set order status directly to completed/refunded -> Must fail with 403",
    `/orders/${testOrderId}/status`,
    "PATCH",
    userToken,
    { status: "refunded" },
    403
  );

  // --- SETTINGS SECURITY TESTS ---
  await runTest(
    "10. Normal user trying to modify site settings -> Must fail with 403",
    "/admin/settings",
    "PATCH",
    userToken,
    { siteName: "Hacked Site Name" },
    403
  );

  await runTest(
    "11. Admin trying to modify sensitive site settings (maintenance mode) -> Must fail with 403 (Owner only)",
    "/admin/settings",
    "PATCH",
    adminToken,
    { maintenanceMode: true },
    403
  );

  // --- SUPER ADMIN PROTECTION TESTS ---
  await runTest(
    "12. Admin trying to change Owner's role -> Must fail with 403",
    "/admin/users/1",
    "PATCH",
    adminToken,
    { role: "user" },
    403
  );

  await runTest(
    "13. Admin trying to ban Owner account -> Must fail with 403",
    "/users/1/ban",
    "POST",
    adminToken,
    null,
    403
  );

  // --- POSITIVE SECURITY TESTS (ADMIN/OWNER ALLOWED PATHS) ---
  await runTest(
    "14. Admin successfully approves a pending user deposit -> Must pass with 200",
    `/wallet/deposits/${testDepositId}/approve`,
    "POST",
    adminToken,
    null,
    200
  );

  await runTest(
    "15. Owner successfully updates maintenance mode -> Must pass with 200",
    "/admin/settings",
    "PATCH",
    ownerToken,
    { maintenanceMode: true },
    200
  );

  // --- 2FA SECURITY SPECIFIC INTEGRATION TESTS ---
  console.log("🔒 Running 12 new 2FA-specific integration tests...\n");

  // 1. Normal user without 2FA logs in naturally -> Must succeed with 200
  let loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "user@grove.local", password: "123456" })
  });
  results.push({
    name: "16. Normal user without 2FA logs in naturally -> Must succeed with 200",
    expectedStatus: 200,
    actualStatus: loginRes.status,
    passed: loginRes.status === 200
  });

  // 2. Normal user successfully enables 2FA -> POST /auth/enable-2fa returns requiresSetup2FA and challengeToken
  let enableRes = await fetch(`${BASE_URL}/auth/enable-2fa`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userToken}`
    }
  });
  let enableData: any = await enableRes.json();
  let userChallengeToken = enableData.challengeToken;
  let userSecret = enableData.secret;

  results.push({
    name: "17. Normal user initiates 2FA setup -> Must return requiresSetup2FA and challengeToken",
    expectedStatus: 200,
    actualStatus: enableRes.status,
    passed: enableRes.status === 200 && enableData.requiresSetup2FA === true && typeof userChallengeToken === "string"
  });

  // Setup verification: let's verify TOTP code to fully enable 2FA
  let setupOtp = getTOTPCode(userSecret);
  let verifySetupRes = await fetch(`${BASE_URL}/auth/verify-2fa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeToken: userChallengeToken, code: setupOtp })
  });
  let verifySetupData: any = await verifySetupRes.json();
  let backupCodes = verifySetupData.backupCodes || [];

  results.push({
    name: "18. Normal user successfully completes 2FA verification setup -> Must return backup codes",
    expectedStatus: 200,
    actualStatus: verifySetupRes.status,
    passed: verifySetupRes.status === 200 && Array.isArray(backupCodes) && backupCodes.length === 8
  });

  // 3. Normal user after activation cannot log in with only password -> login must return requires2FA
  let loginAfter2FARes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "user@grove.local", password: "123456" })
  });
  let loginAfter2FAData: any = await loginAfter2FARes.json();
  let loginChallengeToken = loginAfter2FAData.challengeToken;

  results.push({
    name: "19. Normal user after 2FA activation cannot login with password only -> Must return requires2FA: true",
    expectedStatus: 200,
    actualStatus: loginAfter2FARes.status,
    passed: loginAfter2FARes.status === 200 && loginAfter2FAData.requires2FA === true && typeof loginChallengeToken === "string"
  });

  // 4. Wrong TOTP code is rejected -> POST /auth/verify-2fa returns 400
  let wrongVerifyRes = await fetch(`${BASE_URL}/auth/verify-2fa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeToken: loginChallengeToken, code: "000000" })
  });
  results.push({
    name: "20. Wrong TOTP code is rejected during 2FA login -> Must fail with 400",
    expectedStatus: 400,
    actualStatus: wrongVerifyRes.status,
    passed: wrongVerifyRes.status === 400
  });

  // 5. Backup code works exactly once -> Must log in user with 200
  let backupLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "user@grove.local", password: "123456" })
  });
  let backupLoginData: any = await backupLoginRes.json();
  let backupChallengeToken = backupLoginData.challengeToken;

  let backupVerifyRes = await fetch(`${BASE_URL}/auth/verify-2fa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeToken: backupChallengeToken, code: backupCodes[0] })
  });
  results.push({
    name: "21. Backup code works successfully as 2FA login bypass -> Must succeed with 200",
    expectedStatus: 200,
    actualStatus: backupVerifyRes.status,
    passed: backupVerifyRes.status === 200
  });

  // Get a new challenge token to test using the same backup code again
  let newLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "user@grove.local", password: "123456" })
  });
  let newLoginData: any = await newLoginRes.json();
  let newChallengeToken = newLoginData.challengeToken;

  // 6. Backup code cannot be used a second time -> Must fail with 400
  let reuseBackupRes = await fetch(`${BASE_URL}/auth/verify-2fa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeToken: newChallengeToken, code: backupCodes[0] })
  });
  results.push({
    name: "22. Used backup code cannot be reused -> Must fail with 400",
    expectedStatus: 400,
    actualStatus: reuseBackupRes.status,
    passed: reuseBackupRes.status === 400
  });

  // 7. Admin without 2FA is forced to setup -> Must return requiresSetup2FA: true
  let adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "qtybhrbas774@gmail.com", password: "Thaermoh@@123456" })
  });
  let adminLoginData: any = await adminLoginRes.json();
  let adminChallengeToken = adminLoginData.challengeToken;

  results.push({
    name: "23. Admin without 2FA is forced to perform setup on login -> Must return requiresSetup2FA: true",
    expectedStatus: 200,
    actualStatus: adminLoginRes.status,
    passed: adminLoginRes.status === 200 && adminLoginData.requiresSetup2FA === true && typeof adminChallengeToken === "string"
  });

  // 8. Admin cannot access the admin panel before setup -> Must fail with 401 or 403
  let adminPanelRes = await fetch(`${BASE_URL}/admin/settings`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${adminChallengeToken}`
    },
    body: JSON.stringify({ maintenanceMode: true })
  });
  results.push({
    name: "24. Admin cannot access admin panel or modify settings before activating 2FA -> Must fail with 401/403",
    expectedStatus: 401,
    actualStatus: adminPanelRes.status,
    passed: adminPanelRes.status === 401 || adminPanelRes.status === 403
  });

  // 9. Owner cannot disable 2FA without verification / Owner can't disable 2FA because it is mandatory -> Must return 403
  let disableAdmin2FARes = await fetch(`${BASE_URL}/auth/disable-2fa`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ownerToken}`
    },
    body: JSON.stringify({ password: "Thaermoh@@123456", code: "000000" })
  });
  results.push({
    name: "25. Administrative accounts (Admin/Owner) cannot disable 2FA -> Must fail with 403",
    expectedStatus: 403,
    actualStatus: disableAdmin2FARes.status,
    passed: disableAdmin2FARes.status === 403
  });

  // 10. Normal user cannot reset 2FA for anyone -> Must fail with 403
  let userResetAdminRes = await fetch(`${BASE_URL}/admin/users/2/reset-2fa`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userToken}`
    }
  });
  results.push({
    name: "26. Normal user cannot reset Two-Factor Authentication for admins -> Must fail with 403/401",
    expectedStatus: 403,
    actualStatus: userResetAdminRes.status,
    passed: userResetAdminRes.status === 403 || userResetAdminRes.status === 401
  });

  // 11. Only Owner can reset 2FA for Admin -> Must succeed with 200
  let ownerResetAdminRes = await fetch(`${BASE_URL}/admin/users/2/reset-2fa`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ownerToken}`
    }
  });
  results.push({
    name: "27. Owner can successfully reset Two-Factor Authentication for Admin accounts -> Must succeed with 200",
    expectedStatus: 200,
    actualStatus: ownerResetAdminRes.status,
    passed: ownerResetAdminRes.status === 200
  });

  // 12. All failed 2FA verification attempts are subject to rate limiting -> 6th consecutive attempt must return 429
  let rateLimitPassed = false;
  for (let i = 0; i < 6; i++) {
    let rateLimitRes = await fetch(`${BASE_URL}/auth/verify-2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeToken: "invalid_token", code: "000000" })
    });
    if (rateLimitRes.status === 429) {
      rateLimitPassed = true;
      break;
    }
  }
  results.push({
    name: "28. 2FA verification attempts are strictly rate limited -> 6th consecutive bad attempt must yield 429",
    expectedStatus: 429,
    actualStatus: rateLimitPassed ? 429 : "Not limited (Failed)",
    passed: rateLimitPassed
  });

  // Stop the server
  server.close(() => {
    console.log("\nTest server shut down successfully.");
    try {
      if (fs.existsSync(testStorePath)) {
        fs.unlinkSync(testStorePath);
      }
    } catch (_) {}
  });

  // Display results
  console.log("\n==================================================");
  console.log("📊 SECURITY TEST RESULT REPORT 📊");
  console.log("==================================================");
  
  let allPassed = true;
  results.forEach((r, idx) => {
    const statusText = r.passed ? "✅ PASSED" : "❌ FAILED";
    if (!r.passed) allPassed = false;
    console.log(`${idx + 1}. [${statusText}] ${r.name}`);
    console.log(`   Expected status: ${r.expectedStatus} | Actual status: ${r.actualStatus}`);
  });

  console.log("==================================================");
  if (allPassed) {
    console.log("🏆 STATUS: 100% SECURE. ALL AUDITS PASSED SUCCESSFULLY!");
  } else {
    console.log("⚠️ STATUS: AUDITS FAILED. GAPS IN COMPLIANCE WERE DETECTED!");
  }
  console.log("==================================================\n");
}

startTests();
