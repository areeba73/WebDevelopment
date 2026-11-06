<?php
declare(strict_types=1);

namespace Nexum\Api;

use Dotenv\Dotenv;

/**
 * Thin wrapper over environment variables.
 *
 * In development, values come from api/.env (via phpdotenv).
 * In production, values come from the host's environment-variable settings
 * (cPanel / Plesk / direct Apache SetEnv) — exactly the same API, zero code
 * change between environments. safeLoad() means a missing .env is fine when
 * real env vars are already present.
 */
final class Config
{
    private static bool $loaded = false;

    public static function load(string $basePath): void
    {
        if (self::$loaded) {
            return;
        }
        if (is_file($basePath . '/.env')) {
            $dotenv = Dotenv::createImmutable($basePath);
            $dotenv->safeLoad();
        }
        self::$loaded = true;
    }

    /**
     * Read an environment variable. Returns $default when missing or empty.
     */
    public static function get(string $key, ?string $default = null): ?string
    {
        $value = $_ENV[$key]
            ?? $_SERVER[$key]
            ?? (($raw = getenv($key)) !== false ? $raw : null);

        if ($value === null || $value === '') {
            return $default;
        }
        return (string) $value;
    }

    /**
     * Read a required environment variable. Throws when missing.
     */
    public static function require(string $key): string
    {
        $value = self::get($key);
        if ($value === null) {
            throw new \RuntimeException("Missing required environment variable: {$key}");
        }
        return $value;
    }

    public static function isProduction(): bool
    {
        return self::get('APP_ENV') === 'production';
    }

    public static function isDebug(): bool
    {
        return self::get('APP_DEBUG', 'false') === 'true';
    }

    /**
     * Redact credential-shaped substrings before logging.
     *
     * The MongoDB driver's connection/auth exceptions can echo the full
     * connection string in their messages — including user:password. Every
     * string we pass to error_log() must go through this helper so a
     * misrouted log file can never leak the Atlas password.
     *
     * Masks the password portion only; keeps the user and host visible
     * for diagnostics.
     */
    public static function redactSecrets(string $s): string
    {
        // mongodb://user:password@host  and  mongodb+srv://user:password@host
        $s = preg_replace(
            '~(mongodb(?:\+srv)?://)([^:/@\s]+):([^@\s]+)@~i',
            '$1$2:***@',
            $s
        ) ?? $s;
        // Also mask a stray "password=..." or "pwd=..." query-ish token
        $s = preg_replace(
            '~(?i)\b(password|passwd|pwd)=([^\s&"\']+)~',
            '$1=***',
            $s
        ) ?? $s;
        return $s;
    }
}
