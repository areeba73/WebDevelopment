<?php
declare(strict_types=1);

namespace Nexum\Api\Controllers;

use Nexum\Api\Http\Json;
use Nexum\Api\Http\Request;
use Nexum\Api\Repositories\InquiryRepository;
use Nexum\Api\Security\RateLimiter;
use Nexum\Api\Validation\ContactInput;

/**
 * POST /api/contact
 *
 * Accepts a contact-form submission. Pipeline, in order:
 *   1. Method guard (POST only)
 *   2. Content-Type guard (JSON or form-encoded)
 *   3. Body size guard (MAX_BODY_BYTES)
 *   4. Honeypot: silent 200 when the hidden field is filled
 *   5. Rate limit per client IP (writes rate_limits doc)
 *   6. Server-side validation + sanitization
 *   7. Insert into `inquiries`
 *   8. 201 JSON with the new _id
 *
 * No email, no Turnstile, no admin — those are later phases.
 */
final class ContactController
{
    /** Accepted request MIME types. */
    private const ACCEPTED_CT = [
        'application/json',
        'application/x-www-form-urlencoded',
        // multipart/form-data is handled by its prefix in Request::body()
    ];

    /**
     * Any non-null, non-empty value trips the honeypot — string, array,
     * number, bool, nested structures. Only null, empty string, or an
     * empty array pass through as "not filled".
     */
    private static function honeypotFilled(mixed $value): bool
    {
        if ($value === null) return false;
        if (is_string($value)) return trim($value) !== '';
        if (is_array($value))  return $value !== [];
        return true; // any scalar or object counts as filled
    }

    public function handle(): void
    {
        // 1. Method
        if (Request::method() !== 'POST') {
            header('Allow: POST');
            Json::error(405, 'method_not_allowed', 'This endpoint accepts POST only.');
            return;
        }

        // 2+3. Content type & body size
        $body = Request::body();
        if ($body === false) {
            Json::error(413, 'payload_too_large', 'Request body is too large.');
            return;
        }
        if ($body === null) {
            Json::error(
                415,
                'unsupported_media_type',
                'Content-Type must be application/json or application/x-www-form-urlencoded.'
            );
            return;
        }

        // 4. Honeypot — bots fill a hidden "website" field. Array-safe:
        //    trips on ANY non-null, non-empty value (string, array of
        //    anything, numeric, etc.) so `website[]=x` can't bypass.
        //    Returns a benign 200 so bots don't probe for the error path.
        if (self::honeypotFilled($body['website'] ?? null)) {
            error_log('[api/contact] honeypot triggered ip=' . Request::clientIp());
            Json::ok([
                'message' => 'We have received your inquiry.',
            ]);
            return;
        }

        // 5. Rate limit per IP
        $ip = Request::clientIp();
        $rl = RateLimiter::enforce($ip, 'contact');
        if ($rl['allowed'] === false) {
            header('Retry-After: ' . (string) $rl['retryAfterSeconds']);
            Json::error(
                429,
                'rate_limited',
                'Too many submissions from your network. Please try again later.',
                ['retryAfterSeconds' => $rl['retryAfterSeconds']]
            );
            return;
        }

        // 6. Validate + sanitize
        $validated = ContactInput::validateAndNormalize($body);
        if ($validated['errors'] !== []) {
            Json::error(
                422,
                'validation_failed',
                'Please fix the highlighted fields and try again.',
                ['fields' => $validated['errors']]
            );
            return;
        }

        // 7. Insert
        try {
            $repo = new InquiryRepository();
            $id   = $repo->insert($validated['data'], [
                'ip'        => $ip,
                'userAgent' => Request::userAgent(),
                'referrer'  => Request::referrer(),
            ]);
        } catch (\Throwable $e) {
            // Never leak the driver error to clients. Log full context,
            // with credentials masked by Config::redactSecrets().
            error_log(\Nexum\Api\Config::redactSecrets(sprintf(
                '[api/contact] save failed: %s: %s in %s:%d',
                get_class($e),
                $e->getMessage(),
                $e->getFile(),
                $e->getLine()
            )));
            Json::error(
                500,
                'save_failed',
                'We could not save your inquiry right now. Please try again shortly.'
            );
            return;
        }

        // 8. 201 Created
        Json::ok(
            [
                'id'      => $id,
                'message' => "Thank you — we've received your inquiry and will reply within 1 business day.",
            ],
            201
        );
    }
}
