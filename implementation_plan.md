# Implementation Plan — Streamlining Visit Form Fields

This plan outlines the streamlining of the central `VisitForm` (`frontend/src/components/visit-form.tsx`) by removing several redundant clinical text fields. 

---

## The Problem

Currently, clinicians are presented with several overlapping and redundant fields in the visit form:
1. **Initial Complaints (New Consultations):** Added in the clinical notes step, despite clinicians already entering the **"Main complaint"** on the first step ("Visit details"). This requires tedious re-typing or copy-pasting.
2. **Symptoms of previous consult (Follow-ups):** Added in the evaluation step as a generic text field.
3. **Evaluation on previous complaint (Follow-ups):** Added in the evaluation step as a generic text field.

Both of these follow-up text fields are completely obsolete because **Step 2 (Symptoms / Problems)** already carries forward all active, open symptoms from previous visits as structured items. In Step 2, clinicians can type detailed progress notes directly on each individual symptom and mark them as resolved or keep them open, which is a much more robust and structured clinical workflow.

---

## Proposed Changes

We will modify `frontend/src/components/visit-form.tsx` to remove these three fields from the UI while keeping the backend payloads completely safe and consistent.

### Component: `visit-form.tsx`

#### [MODIFY] [visit-form.tsx](file:///c:/Users/ayand/Local%20Library/Github/Harmony-System-Django/frontend/src/components/visit-form.tsx)

We will execute the following edits:

1. **Remove "Initial complaints" Textarea from the UI:**
   - Locate and delete the `<label>` rendering "Initial complaints" (lines 849–852).
   - In `handleSubmit`, set the backend `initial_complaints` payload key to our compiled `complaintSummary` (which reads from the first step's "Main complaint" field, falling back to a summary of symptoms). This guarantees that historical records, dashboard panels, and PDF exports that look up `initial_complaints` continue to show the complaint data cleanly without database schema breaking changes.

2. **Remove "Symptoms of previous consult" & "Evaluation on previous complaint" from the UI:**
   - Locate and delete the two `<label>` blocks rendering "Symptoms of previous consult" and "Evaluation on previous complaint" (lines 826–833).
   - In `handleSubmit` of the visit form:
     - Set `evaluation_previous_complaint` in the `follow_up_review` JSON block to an empty string `""` (or map a concise summary of the resolved symptoms).
     - Set `previous_consult_symptoms` in the nested `follow_up_evaluation` dictionary to `""` (empty string).
     - Set `evaluation_notes` in the nested `follow_up_evaluation` dictionary to `""` (empty string).
     - This ensures that the backend view and serializer save the visit cleanly without receiving `null` or missing-key exceptions.

---

## User Review Required

Please review the proposed streamlined changes:

> [!IMPORTANT]
> - **Preserving Data Consistency:** To avoid migrations or breaking existing report templates, the backend database fields will remain unchanged. The frontend will simply stop rendering these text areas and automatically map the first step's "Main complaint" to the database's `initial_complaints` field.
> - **Symptom Resolution Workflow:** Clinicians will continue using the **Symptoms / Problems** step to resolve past complaints and write granular progress notes. The redundant generic text boxes on the follow-up step will be completely removed.

---

## Verification Plan

We will perform manual testing to ensure form streamlining is complete and works correctly:

### Manual Verification
1. **Visual Streamlining Check (New Consultation):**
   - Go to a patient's workspace, click **"New Visit"** and select **"New consultation"**.
   - Navigate to the **"Clinical notes"** step and verify that "Initial complaints" is gone.
   - Fill out the form, set "Main complaint" to `"Severe fever and headache"` on step 1, save, and verify that the visit saves successfully and displays the complaint properly on the patient workspace.
2. **Visual Streamlining Check (Follow-up):**
   - Go to a patient, click **"New Visit"** and select **"Follow up"**.
   - Navigate to the **"Evaluation (follow up)"** step and verify that the two text areas ("Symptoms of previous consult" and "Evaluation on previous complaint") are removed.
   - Verify that the rest of the sliders (energy, appetite, sleep, mental state since remedy) remain fully functional.
   - Save the follow-up and ensure it posts to the backend successfully with exit code 0.
3. **Draft Stability:**
   - Verify that the auto-drafting and reminder banner continue to work flawlessly with the streamlined fields removed.
