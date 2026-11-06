<?php
declare(strict_types=1);

namespace Nexum\Api\Http;

/**
 * Tiny JSON response helper. All API responses go through here so the
 * content type, cache header and envelope shape stay consistent.
 *
 * Success:  { "ok": true,  ... }
 * Error:    { "ok": false, "error": "<code>", "message": "<text>", ... }
 */
final class Json
{
    public static function send(int $status, array $body): void
    {
        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: application/json; charset=utf-8');
            header('Cache-Control: no-store');
        }
        echo json_encode($body, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    }

    public static function ok(array $extra = [], int $status = 200): void
    {
        self::send($status, ['ok' => true] + $extra);
    }

    public static function error(int $status, string $code, string $message, array $extra = []): void
    {
        self::send($status, ['ok' => false, 'error' => $code, 'message' => $message] + $extra);
    }
}
