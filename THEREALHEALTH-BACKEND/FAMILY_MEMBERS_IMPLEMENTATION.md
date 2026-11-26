# Family Members and member-specific Prakriti

## Delivered flow

Profile -> Family Members -> Add/Edit Member. Prakriti Analysis -> Select Member -> Member Dashboard -> Start Analysis, Latest Report, Reports, Consult and Plan, My Appointments or My Plans. Switching members creates a new route with an explicit typed member; there is no shared mutable selected-member global.

The result/report and paid-plan flow use the same member throughout. After verified payment, confirmation offers Book Appointment and Go to Dashboard. Booking opens the existing availability screen without a doctor-selection step; TRH assigns the doctor through its existing process.

## Account and member model

- The existing User remains the authenticated account and the real Self profile. Self is represented by the stable ID `self`, not a duplicate dependent document. Its name, age and gender come from User; editing opens the existing profile editor.
- FamilyMember stores accountUserId (String, matching User), fullName, relationship, dateOfBirth, gender, profileImage, isActive, archivedAt and timestamps. Dependents use Mongo ObjectIds and have no login, password or OTP.
- Required fields are validated on both sides. The server rejects invalid calendar dates, future birth dates, blank/overlong names and unsupported relationship/gender values. Age is computed from the birth date with birthday handling.
- Relationships: Spouse, Son, Daughter, Father, Mother, Brother, Sister, Child, Parent, Other. Genders: Male, Female, Other.
- Avatars currently use initials. Optional photo upload was not added; no sample photographs or fictitious people are seeded into production.
- Delete is an archive operation with a confirmation dialog. Linked history is retained. Archived members can be shown and restored; they cannot start new assessments, purchases or bookings. Self cannot be archived.

## Authenticated API

All routes reuse the existing JWT middleware and phone/Google account lookup. Registration-only tokens are rejected. The server derives ownership from authentication, never a client-supplied accountUserId.

| Method | Endpoint | Result |
|---|---|---|
| GET | /api/family-members | Self and active dependents; includeArchived=true includes archives |
| POST | /api/family-members | Create a validated dependent |
| GET | /api/family-members/:id | Read an owned member |
| PATCH | /api/family-members/:id | Edit whitelisted fields; isActive=true restores |
| DELETE | /api/family-members/:id | Archive, preserving records |

Example creation:

```json
{"fullName":"Samarth","relationship":"Son","dateOfBirth":"2014-05-20","gender":"Male"}
```

Prakriti latest, by-ID and history reads, assessment submission, wellness purchase creation/read/verification, and member appointment queries carry `familyMemberId`. The existing appointment booking endpoint additionally accepts `purchaseId` for Prakriti Guidance. It verifies an active paid purchase belongs to that account and member before booking.

## Separate histories and compatibility

PrakritiAssessment, WellnessPurchase and Appointment now store familyMemberId, defaulting to self. Purchases snapshot beneficiaryName; appointments snapshot patientName and link purchaseId. Queries combine the authenticated account with the selected member. Existing records with missing/null familyMemberId are read only under Self, so no bulk reassignment or destructive migration is needed. Mongo model indexes cover the new member-scoped queries.

Prakriti scoring, question order and dosha classification remain unchanged. The server saves each assessment separately, returns its dynamic report without internal answers/scores, and supports member-specific latest/history. History is currently limited to the latest 100 assessments; the plan list returns the latest 10 purchases.

Flutter report-cache keys include both account and member. The cached envelope is also validated against the current authenticated account and member before display. An account-owned v2 cache may migrate only to Self. Unowned v1 data is retained in storage but is not assigned to anyone. Clearing cache falls back to the member's server report.

Existing account-level My Appointments remains available. Opening appointments from a member dashboard filters to that member, shows the patient name, and carries the same identity through cancellation and booking. Existing doctor-based booking elsewhere remains available.

## Files

Flutter additions:

- lib/family_member.dart: typed identity and age/cache helpers.
- lib/family_api.dart: authenticated CRUD and report history.
- lib/family_member_card.dart: shared member presentation.
- lib/family_members_screen.dart: management and single-member selection.
- lib/family_member_form.dart: add/edit validation.
- lib/member_dashboard_screen.dart: switching, member actions, archive/restore.
- lib/member_records_screen.dart: member reports and purchases.
- test/family_flow_test.dart and test/trh_preview_test.dart.

Flutter integration changes: lib/user_profile_screen.dart, lib/prakriti_analysis_screen.dart, lib/prakriti_api.dart, lib/prakriti_report.dart, lib/Appointment_Screen.dart, lib/Consultation_screen.dart, the wellness model/API/screens, and test/prakriti_analysis_test.dart. The separate wellness document lists its new files and Razorpay dependency.

Backend additions: models/FamilyMember.js, services/familyMemberService.js, controllers/familyMemberController.js, routes/familyMemberRoutes.js and test/family.test.js.

Backend integration changes: index.js; PrakritiAssessment, WellnessPurchase and Appointment models; Prakriti, wellness and appointment controllers; Prakriti routes/report service; and existing feature tests. Authentication, OTP, Google sign-in, base URL, pricing and scoring were not changed by family integration.

## Verification

- Backend: `node --test test/prakriti.test.js test/wellness.test.js test/family.test.js` — 17 passed. Includes all 59,049 answer combinations, ownership, CRUD, invalid data, member-specific latest/history, archive/restore, legacy Self records, purchase isolation and doctor-unassigned appointment booking.
- Flutter: combined family, wellness, Prakriti analysis/report and preview tests — 23 passed. Covers selecting/adding/editing/archiving members, switching cache identity, v2 Self migration, preserving member/purchase during booking, canceled/pending/unverified payments, exact required price examples, and narrow screens with enlarged text.
- Targeted Flutter analysis of 25 changed files/tests: no issues found.
- Seven readable-font screen previews rendered and visually reviewed: trh-app/build/trh-previews. Fixture names exist only in tests.
- Android debug APK built successfully: trh-app/build/app/outputs/flutter-apk/app-debug.apk. Build log: trh-app/build/family-android-build.log.
- Full-project analysis still has unrelated findings, including missing DoctorApi imports under ios/ and obsolete selectedRole arguments in test/widget_test.dart. Existing prakriti_booking_test.dart has two doctor-name finder assertions that match twice; the new member-booking test passes. No claim is made that the entire legacy test suite is clean.

Backend HTTP tests use an actual Express listener with isolated persistence/provider substitutes. Live MongoDB writes, physical-device interaction and real Razorpay transactions were not performed. RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are absent in the inspected environment; configure test credentials and auto-capture as described in WELLNESS_PLAN_IMPLEMENTATION.md before testing checkout. No fake-success production path or hardcoded credentials were added.

## Manual acceptance checks

1. Start the backend with the existing Mongo/JWT settings and sign in normally. Profile -> Family Members should show the real Self once.
2. Add two dependents with different birthdays; verify age, relationship and gender. Restart and verify persistence. Reject blank names, invalid/future dates and missing selections.
3. Edit one dependent. Archive after confirmation, show archives, inspect retained records and restore. Self cannot be archived.
4. Open Prakriti Analysis, select the first dependent and continue. Confirm its name remains visible. Complete an assessment and reopen its latest report and history.
5. Switch to the second dependent; the first dependent's report must not appear. Repeat after app restart and after deleting only local report cache. Check Self's legacy records remain under Self.
6. Use Consult and Plan for the first dependent. Select Weight Management and 3 Months; confirm INR 8,000 / US $100. Back from payment retains selection and member.
7. Complete a Razorpay test payment. Only server-verified captured payment should activate the plan. Confirm My Plans belongs to the same member and another member cannot open it by changing IDs.
8. From confirmation, Book Appointment. Choose an available slot and verify the stored familyMemberId, patientName and purchaseId, with doctor assignment pending. Verify it appears only in that member's appointment view and in the account-wide view.
9. Attempt another account's member/report/purchase IDs and a different member's paid purchase: reject without exposing records or creating an appointment. Cancel/retry payment and verify no duplicate activation.
10. Archive a member with historical records: history stays readable, pending payment can be reconciled, and new activities are blocked until restoration.

No git add, commit, push, reset or branch change was performed. Existing unrelated working-tree changes were retained.
