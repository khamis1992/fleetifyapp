# Employee Call AI Analysis

## Goal

Automatically transcribe a saved employee call recording, analyze the Arabic transcript, persist the result, and show it to the employee without exposing AI credentials in the browser.

## Flow

1. The employee records and saves the call in `CallLogDialog`.
2. The browser uploads the audio to the private `call-recordings` bucket and creates a `customer_communications` row with `transcription_status = pending`.
3. The authenticated browser invokes the `analyze-call-recording` Edge Function with the communication ID.
4. The function verifies the user owns the communication, downloads the recording through user-scoped Storage access, and sends it to OpenAI file transcription.
5. The transcript is analyzed with a strict JSON schema for summary, outcome, sentiment, payment promise, follow-up, actions, and risks.
6. The function persists the transcript and analysis on the communication row. The dialog displays the result and offers a retry when analysis fails.

## Security and privacy

- `OPENAI_API_KEY` is stored only in Supabase Secrets.
- The Edge Function requires a valid JWT and only reads communications owned by the authenticated employee.
- Recordings remain in a private, company-scoped bucket.
- The UI reminds the employee to obtain the customer's consent before recording.
- Provider errors returned to the client are sanitized; detailed upstream responses remain in function logs.

## Failure handling

The call record and audio are retained when AI processing fails. The row is marked `failed`, the error is stored, and the employee can retry analysis from the same dialog. Successful processing marks the row `completed` with a completion timestamp.

## Required deployment configuration

- Apply `20260803083845_employee_call_recordings_storage.sql`.
- Apply `20260803114717_employee_call_ai_analysis.sql`.
- Set the Supabase secret `OPENAI_API_KEY`.
- Deploy the `analyze-call-recording` Edge Function with JWT verification enabled.
