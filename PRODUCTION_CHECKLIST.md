# VoiceGift production launch checklist

## Accounts and policy

- [ ] Company/operator identity confirmed
- [ ] Domain and support email configured
- [ ] Privacy counsel reviewed voice and biometric-data obligations
- [ ] Terms, refund policy, and consent language reviewed
- [ ] PayPal merchant account approved for digital goods
- [ ] Media vendors permit commercial use and do not train on customer voice data
- [ ] Data Processing Agreements completed where required

## Supabase

- [ ] Migration executed
- [ ] Bucket remains private
- [ ] Secret key is server-only
- [ ] Admin magic-link redirect URLs configured
- [ ] Point-in-time recovery/backups configured
- [ ] Database region and data residency documented

## PayPal

- [ ] Sandbox create/capture verified
- [ ] Webhook signature verification verified
- [ ] Duplicate webhook replay tested
- [ ] Wrong amount/currency test rejected
- [ ] Refund process documented and tested
- [ ] Live credentials scoped only to Production

## AI/media

- [ ] Voice phrase/liveness test verified
- [ ] Living-artist imitation blocked
- [ ] Copyrighted song upload absent
- [ ] Provider callback retries tested
- [ ] Temporary provider files are deleted by provider
- [ ] Failure and timeout paths produce actionable admin errors
- [ ] Per-song cost and maximum cost guardrail measured

## Security

- [ ] All random secrets are unique and at least 32 bytes
- [ ] Turnstile configured
- [ ] Rate limiting tested
- [ ] Signed URLs expire
- [ ] Public share links are revocable
- [ ] CSP checked with PayPal and Turnstile in production
- [ ] Admin email allowlist tested
- [ ] Dependency/security scan passed

## Lifecycle

- [ ] Immediate deletion tested
- [ ] Daily cron cleanup tested
- [ ] Email links open private projects
- [ ] User can close and resume during generation
- [ ] One-revision limit enforced
- [ ] Failed job retry tested
- [ ] Support escalation path documented

## Analytics

- [ ] Privacy-safe funnel events configured
- [ ] No voice URLs, access tokens, memories, or emails sent to analytics
- [ ] Monitor creation → upload → verified → preview → payment → completion
- [ ] Monitor provider latency, failure rate, and cost per completed song
