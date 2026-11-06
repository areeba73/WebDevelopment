<?php
declare(strict_types=1);

namespace Nexum\Api\Http;

/**
 * Request parsing utilities.
 *
 * Reads the raw body once, decodes JSON or form-encoded payloads, and
 * returns a predictable associative array to controllers. Also resolves
 * the real client IP, honouring a configurable trusted-proxy list.
 */
final class Request
{
    /** Maximum body size we're willing to buffer for this API. */
    public const MAX_BODY_BYTES = 32768; // 32 KiB — a contact form never needs more

    public static function method(): string
    {
        return strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    }

    /**
     * MIME type only (no parameters). Lower-cased, trimmed.
     */
    public static function contentType(): string
    {
        $ct = (string) ($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '');
        $first = explode(';', $ct)[0] ?? '';
        return strtolower(trim($first));
    }

    /**
     * Raw request body (cached per request).
     */
    public static function rawBody(): string
    {
        static $cached = null;
        if ($cached === null) {
            $cached = (string) file_get_contents('php://input');
        }
        return $cached;
    }

    /**
     * Parsed body as an associative array.
     *
     * Returns `false` when the payload exceeds MAX_BODY_BYTES.
     * Returns `null` when the Content-Type is not one we accept.
     * Returns `[]` when the body is empty or JSON-null.
     */
    public static function body(): array|false|null
    {
        $raw = self::rawBody();
        if (strlen($raw) > self::MAX_BODY_BYTES) {
            return false;
        }
        $ct = self::contentType();

        if ($ct === 'application/json') {
            if ($raw === '') {
                return [];
            }
            $decoded = json_decode($raw, true);
            return is_array($decoded) ? $decoded : [];
        }

        if ($ct === 'application/x-www-form-urlencoded' || str_starts_with($ct, 'multipart/form-data')) {
            return $_POST;
        }

        return null;
    }

    /**
     * Resolve the real client IP.
     *
     * Reads REMOTE_ADDR unless it matches a trusted proxy (from the
     * TRUSTED_PROXIES env var — comma-separated list of literal IPs).
     * When trusted, takes the left-most IP from X-Forwarded-For.
     */
    public static function clientIp(): string
    {
        $remote = (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');

        $trustedRaw = (string) (getenv('TRUSTED_PROXIES') ?: '');
        $trusted = array_filter(array_map('trim', explode(',', $trustedRaw)));

        if ($trusted !== [] && in_array($remote, $trusted, true)) {
            $xff = (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? '');
            if ($xff !== '') {
                $first = trim(explode(',', $xff)[0]);
                if (filter_var($first, FILTER_VALIDATE_IP) !== false) {
                    return $first;
                }
            }
        }
        return $remote;
    }

    public static function userAgent(): string
    {
        return mb_substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 500);
    }

    public static function referrer(): string
    {
        return mb_substr((string) ($_SERVER['HTTP_REFERER'] ?? ''), 0, 500);
    }
}
