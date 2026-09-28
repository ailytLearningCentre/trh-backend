# Prakriti consultation-plan flow

## Delivered architecture

Prakriti Report -> Consult and Plan (program and duration on the same screen) -> Payment for Consultation -> server-verified Plan Confirmation -> Book Appointment or Dashboard.

The Prakriti report and family dashboard open this flow directly without doctor selection. Existing doctor-based consultation remains available elsewhere. The appointment flow now accepts the selected family member and verified purchase, using the existing unassigned-doctor capacity logic. Sign-in, registration, questionnaire scoring and base_url.dart were not changed by this implementation.

The catalog is fetched from the authenticated backend. The Flutter selection screen keeps one program, one DurationOption and a currency in state. Its payment route receives one typed WellnessSelection; back navigation retains the original selection. Prices are never maintained in a second Flutter table. Server purchase snapshots replace the displayed selection before checkout; a changed price requires another explicit Pay tap.

## Single pricing source

`config/wellnessCatalog.json` contains all six requested programs and these exact prices for every program:

| Months | INR | USD |
|---|---:|---:|
| 1 | 3000 | 45 |
| 3 | 8000 | 100 |
| 6 | 14000 | 180 |
| 9 | 20000 | 250 |
| 12 | 26000 | 320 |

Both prices are displayed. INR is the default checkout currency; USD can be selected explicitly. USD acceptance requires the merchant account to support that currency. The selected currency is shown on payment and confirmation. There are no added fees or invented benefits. The only inclusion shown is the supplied generic expert-guidance wording.

## Backend APIs and persistence

All endpoints reuse `authenticateUser` and resolve the existing phone/Google user identity. Registration-only tokens are rejected.

- `GET /api/wellness/catalog`: programs, duration prices, inclusions, currencies.
- `POST /api/wellness/purchases`: accepts programId, months, currency, requestId and familyMemberId; ignores arbitrary client amounts/userId/doctorId. Saves a purchase and creates a Razorpay order from server prices.
- `GET /api/wellness/purchases`: ten recent purchases owned by the user and selected family member, for interrupted-payment recovery.
- `GET /api/wellness/purchases/:id`: owned purchase; checks provider order payments and activates only a matching captured payment. Does not offer checkout again while payment is authorized and awaiting capture.
- `POST /api/wellness/purchases/:id/verify`: accepts orderId, paymentId and signature. Checks the signature against the stored order ID, then fetches the payment from Razorpay and validates its order, currency, amount and captured status.

All purchase requests carry familyMemberId (default self). Ownership is checked against the authenticated account and selected member; archived members cannot start new purchases. Existing pending payments can still be verified after archival. WellnessPurchase also stores familyMemberId and a beneficiaryName snapshot.

WellnessPurchase stores a String User reference (matching the existing schema), program and duration snapshots, both prices, the actual checkout currency/minor-unit amount, catalogVersion, requestId, orderId, paymentId, status, activatedAt and timestamps. Unique user/requestId, orderId and paymentId indexes prevent duplicate requests and payment reuse. Activation is atomic and idempotent; duplicate callbacks retain the original activation date. No doctorId is required or stored.

Example creation body:

```json
{"familyMemberId":"self","programId":"weight","months":3,"currency":"INR","requestId":"<32 hex characters or UUID generated once per checkout attempt>"}
```

The backend sends only the public Razorpay key ID and trusted checkout order details to Flutter. Keys, signatures and gateway bodies are not logged. Provider failures produce sanitized errors.

## Razorpay setup and verification status

No existing payment screen, Razorpay dependency, order creation or payment verification implementation was found. This implementation adds the official `razorpay_flutter` package and uses Razorpay's REST API on the backend, without introducing another authentication system.

Backend environment required:

```text
RAZORPAY_KEY_ID=<your Razorpay test key ID>
RAZORPAY_KEY_SECRET=<your Razorpay test key secret>
```

These variables were absent in the inspected environment. No credentials were invented or written. Until configured, creation returns 503 with a clear message and no active plan. Keep the secret backend-only. Configure payment auto-capture in the Razorpay merchant account: authorized payments remain pending until captured. Do not substitute the SDK success callback for server verification.

Integration references: [official Flutter integration](https://razorpay.com/docs/payments/payment-gateway/flutter-integration/standard/integration-steps/), [fetch payment](https://razorpay.com/docs/api/payments/fetch-with-id/), [create order](https://razorpay.com/docs/api/orders/create/).

Live/test-mode Razorpay transactions and live MongoDB persistence have not been exercised. Automated tests use isolated provider and persistence substitutes, not production fake-success paths. Recent plans and Check payment status recover a lost callback by asking Razorpay directly. No webhook is added; unattended background activation is not claimed. An ambiguous order-creation failure is retained as setup_failed and does not silently create another order for the same request; support can reconcile its purchase receipt before retrying.

## Confirmation and navigation

Only an active server purchase with an activation timestamp opens confirmation. The confirmation displays program, duration, both prices, charged currency and Successful status. The unfinished selection/payment routes above the root are removed. System back and Go to Dashboard both replace the stack with the existing DashboardScreen. Book Appointment opens the existing slot-booking screen with the same member and active purchase ID; the backend verifies both before booking. TRH assigns the doctor later. This reconciles the supplied confirmation reference with the additional appointment-booking requirement. No clinical plan details are fabricated.

## Files

Flutter created:
- lib/wellness_models.dart
- lib/wellness_api.dart
- lib/wellness_checkout.dart
- lib/wellness_widgets.dart
- lib/wellness_plan_screen.dart
- lib/wellness_payment_screen.dart
- lib/wellness_confirmation_screen.dart
- test/wellness_flow_test.dart

Flutter modified: lib/prakriti_analysis_screen.dart (navigation/import), test/prakriti_analysis_test.dart (new destination), pubspec.yaml and pubspec.lock (Razorpay and its eventify dependency). Flutter also updates generated plugin metadata during dependency resolution/build.

Backend created:
- config/wellnessCatalog.json
- services/wellnessCatalogService.js
- services/wellnessPaymentService.js
- models/WellnessPurchase.js
- controllers/wellnessController.js
- routes/wellnessRoutes.js
- test/wellness.test.js

Backend modified: index.js mounts wellness routes and scoped safe request-error handling. Prakriti assessment and appointment models/controllers were additionally extended for family-member ownership; see FAMILY_MEMBERS_IMPLEMENTATION.md.

## Validation

- Combined backend suite: 17 tests passed, including all 59,049 scoring combinations, family isolation, trusted prices and verified activation.
- Combined Flutter suite: 23 tests passed, including 8 payment-flow tests, 6 family-flow tests, 8 Prakriti tests and a rendered-screen preview test.
- Targeted analysis of 25 changed Dart files/tests: no issues found.
- Seven family/plan screen previews rendered and visually reviewed under trh-app/build/trh-previews.
- Android debug APK build passed; see FAMILY_MEMBERS_IMPLEMENTATION.md for the final build result and remaining environment limitations.

## Manual test steps

1. Configure the two Razorpay **test-mode** environment values above on the backend, with the existing JWT/Mongo settings; restart the backend. Enable auto-capture for the test account. Use the existing app backend URL appropriate to the target device.
2. Log in and complete or reopen a Prakriti report. Tap Consult and Plan. Confirm it opens directly, with no doctor selection.
3. Before selection, Continue to Payment is disabled. Select Weight Management, then 3 Months on the same screen. Confirm INR 8,000 / US $100 and the selected highlights.
4. Continue. Confirm Weight Management, 3 Months, both prices and Checkout in INR. Back returns to the same program/duration selection.
5. Pay securely. Complete an official Razorpay test payment. Confirm the backend accepts the HMAC and fetches a matching captured payment. Only then should Plan Confirmation show activated, Successful, and the correct values.
6. Go to Dashboard; system back must not reopen an unfinished checkout. Inspect the stored purchase owner, price, order/payment IDs and activation timestamp.
7. Repeat with Diabetes & Prediabetes + 1 Month (INR 3,000 / US $45), then Stress Management + 12 Months (INR 26,000 / US $320).
8. Cancel checkout: no confirmation. Break network after checkout: use Check payment status. Restart the app and reopen Recent plans to recover a paid order without making another payment.
9. Test forged signatures, incorrect amounts/currencies, another user's purchase ID and registration-only tokens: no activation. Repeat a valid verification: the same activation timestamp remains.
10. Check a 320px-wide phone at enlarged text size. If testing USD, select it explicitly and verify that the gateway/account supports it and the actual currency is USD.

No branch change, git add/commit/push/reset, or unrelated module edits were performed.
