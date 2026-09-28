# Prakriti report implementation

One dynamic Flutter report widget renders new submissions, locally cached reports, and server-retrieved reports. It follows the reference using off-white backgrounds, themed rounded cards, botanical vector illustrations, check icons, and responsive buttons. Approved copy takes precedence over wording in the image. No user-facing points or percentages are rendered.

## Architecture and files

Backend created:
- `models/PrakritiAssessment.js`: Mongoose assessment document.
- `services/prakritiScoringService.js`: question IDs, validation and exact existing scoring rule.
- `services/prakritiProfiles.json`: supplied approved single-dosha content.
- `services/prakritiReportService.js`: explicit public response projection and pending-content fallback.
- `controllers/prakritiController.js`: authenticated ownership resolution, creation and retrieval.
- `routes/prakritiRoutes.js`: authenticated routes.
- `test/prakriti.test.js`: Node built-in tests, no additional packages.

Backend modified: `index.js`, mounting the routes and scoped safe JSON error handling.

Flutter created: `lib/prakriti_api.dart`, `lib/prakriti_profiles.dart` (legacy-cache content only), `lib/prakriti_report.dart`, and `test/prakriti_report_test.dart`.
Flutter modified: `lib/prakriti_analysis_screen.dart`, `test/prakriti_analysis_test.dart`.

## Storage and authentication

Schema: `userId` is a **String** reference to User, matching the existing User schema, not an ObjectId. Assessment IDs use MongoDB ObjectIds. Documents contain normalized answers, enum resultType, internalScores (vata/pitta/kapha), questionnaireVersion, reportVersion, completedAt, createdAt and updatedAt. A compound user/time/ID index supports latest retrieval. Each submission creates a historical document; previous assessments are not overwritten. There is no history-list endpoint, but an owned historical record can be fetched by ID.

Existing `authenticateUser` JWT middleware is reused. The controller resolves phone/_id/id or googleId to the existing User and rejects registration-only tokens. Client userId and scores are ignored. No tokens or credentials are saved in assessment documents. Public report projection omits user identity, answers and scores.

## Exact classification

Scoring was ported unchanged from Flutter `calculatePrakriti` and `PrakritiResult.dominant`: each answer contributes one point to its selected dosha, and every dosha equal to the maximum is included, in Vata/Pitta/Kapha order. No percentage thresholds or new tie rules were added. Original Flutter scoring files remain unchanged.

Vata, Pitta, Kapha and all three dual combinations are reachable. Sama is supported by the existing three-way tie rule and schema, but cannot occur with ten equally weighted answers because ten is not divisible by three. Dual/Sama report guidance still requires doctor-approved content; a neutral pending-content message is rendered. No new rules are required to preserve the existing ties; any future classification change needs approval.

## API

All routes require `Authorization: Bearer <existing login token>`.

- `POST /api/prakriti/assessments`: validates ten unique expected questions, calculates, saves, returns 201.
- `GET /api/prakriti/assessments/latest`: most recent assessment for the authenticated user, or 404.
- `GET /api/prakriti/assessments/:id`: owned assessment; 400 invalid ID, 403 another owner, 404 absent.

POST example:

```json
{
  "answers": [
    {
      "questionId": "build",
      "selectedDosha": "vata"
    },
    {
      "questionId": "skin",
      "selectedDosha": "vata"
    },
    {
      "questionId": "appetite",
      "selectedDosha": "vata"
    },
    {
      "questionId": "digestion",
      "selectedDosha": "vata"
    },
    {
      "questionId": "energy",
      "selectedDosha": "vata"
    },
    {
      "questionId": "sleep",
      "selectedDosha": "vata"
    },
    {
      "questionId": "temperature",
      "selectedDosha": "vata"
    },
    {
      "questionId": "stress",
      "selectedDosha": "vata"
    },
    {
      "questionId": "activity",
      "selectedDosha": "vata"
    },
    {
      "questionId": "temperament",
      "selectedDosha": "vata"
    }
  ]
}
```

Response shape (ID/time placeholders are illustrative, not a real saved record):

```json
{
  "success": true,
  "assessment": {
    "id": "<saved MongoDB assessment ID>",
    "prakritiType": "vata",
    "displayName": "Vata Prakriti",
    "summary": "Your responses indicate a Vata-dominant Prakriti.",
    "traits": [
      "Creative",
      "Energetic",
      "Enthusiastic",
      "Adaptable"
    ],
    "about": "People with Vata dominance typically have traits associated with air and space elements. They tend to be creative, energetic, enthusiastic and adaptable.",
    "reflections": [
      "Notice which daily routines help you feel settled.",
      "Make room for quiet pauses between busy activities.",
      "Reflect on how changes in routine affect your sense of wellbeing."
    ],
    "guidanceText": "Explore diet and lifestyle guidance based on your Vata Prakriti.",
    "themeKey": "vata",
    "contentAvailable": true,
    "completedAt": "<ISO timestamp>",
    "questionnaireVersion": "1",
    "reportVersion": "1"
  }
}
```

## Flutter flow and persistence

Complete questionnaire -> authenticated API POST -> successful server save -> cache report automatically in SharedPreferences account-and-member-scoped `trh_prakriti_report_v3` keys -> render the shared report widget. Failed submission stays on the questionnaire with a retry message; it never pretends a server save succeeded.

?View saved result on this device? loads the current account's cached report first. If absent, mismatched or malformed, it fetches the latest server report and caches it. Cache identity uses the existing JWT subject fields without storing an additional token; this decoding is only for local cache ownership, not authentication. Only account-owned v2 reports migrate, and only to Self. Unowned v1 device results are retained in storage but are not assigned to an account or family member. Local cache failures do not discard a successfully saved server report.

View Recommendations is disabled and explained until approved guidance is implemented. Consult and Plan now opens the member-scoped wellness program/duration/payment flow without doctor selection. See WELLNESS_PLAN_IMPLEMENTATION.md and FAMILY_MEMBERS_IMPLEMENTATION.md for the subsequent integration and current validation.

## Validation

- Backend: `node --test test/prakriti.test.js` passed all 4 groups. Includes all 59,049 answer combinations, invalid inputs, schema validation, unauthenticated requests, registration-token rejection, phone/Google identity, POST/latest/by-ID, ownership, historical preservation and score privacy.
- HTTP tests use an actual temporary Express listener with in-memory model substitutes. A live MongoDB insertion and phone/device end-to-end run have **not** been verified.
- Final targeted Flutter analysis: no issues in the changed Dart files/tests.
- All 8 Prakriti flow/report tests passed, including cache loss, account isolation, 320px width with 2x text, all single themes and dual pending content. Readable-font preview rendering also passed all 4 report tests. Previews: `trh-app/build/prakriti-previews/{vata,pitta,kapha}.png`.
- Android debug build passed: `trh-app/build/app/outputs/flutter-apk/app-debug.apk`.
- Full-project Flutter analysis reported 156 findings including existing missing `doctor_api.dart` imports under `ios/` and obsolete `selectedRole` test arguments. Unrelated files were not changed.
- Existing booking tests: two fail at `test/prakriti_booking_test.dart:157` because a doctor name appears twice; the availability failure test passes. Booking implementation and tests were not modified.

## Manual end-to-end checks

1. Start the backend with its existing MongoDB/JWT environment and use the app's configured reachable base URL. No base URL or port configuration was changed.
2. Sign in, open Prakriti Analysis, fill basic details, complete all ten answers, and submit.
3. Verify the report theme/content for all-Vata, all-Pitta and all-Kapha answers. Check a five/five split displays its dual name and pending guidance.
4. Inspect the PrakritiAssessment collection: correct authenticated user, normalized answers, internal scores, versions and completion timestamps. Check the API response omits internal scores and answers.
5. Go back and reopen the saved result. Restart the app and repeat. Clear only the report cache and verify latest-server retrieval restores it.
6. Submit a second assessment; verify latest returns it and the earlier document still exists.
7. Use another signed-in account to request the first record ID: expect 403. Missing/invalid token: 401. Missing/duplicate/invalid answers: 400. User with no assessment: 404.
8. Check at narrow width and large accessibility text. Confirm recommendations are disabled and Consult and Plan opens the wellness program/duration flow for the selected member.

No commit, push, branch changes, authentication changes or base_url.dart edits were performed. Validation above records the original report-only implementation; the companion family and wellness documents record the final combined implementation.
