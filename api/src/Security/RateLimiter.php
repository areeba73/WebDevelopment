<?php
declare(strict_types=1);

namespace Nexum\Api\Security;

use Nexum\Api\Config;
use Nexum\Api\Repositories\RateLimitRepository;

/**
 * Sliding-window rate limiter backed by MongoDB's `rate_limits` collection.
 *
 * Tunables (env, with safe code defaults):
 *   RATE_LIMIT_MAX_PER_WINDOW   maximum attempts per window        (default 5)
 *   RATE_LIMIT_WINDOW_SECONDS   window length in seconds           (default 600)
 */
final class RateLimiter
{
    public const DEFAULT_MAX_PER_WINDOW = 5;
    public const DEFAULT_WINDOW_SECONDS = 600; // 10 minutes

    /**
     * Enforce the limit for ($ip, $action). When allowed, records a new
     * attempt and returns remaining count. When blocked, returns the
     * retry-after hint without writing.
     *
     * @return array{allowed: bool, remaining?: int, retryAfterSeconds?: int, window?: int}
     */
    public static function enforce(string $ip, string $action): array
    {
        $max = (int) (Config::get('RATE_LIMIT_MAX_PER_WINDOW') ?? self::DEFAULT_MAX_PER_WINDOW);
        $win = (int) (Config::get('RATE_LIMIT_WINDOW_SECONDS') ?? self::DEFAULT_WINDOW_SECONDS);
        if ($max < 1) { $max = self::DEFAULT_MAX_PER_WINDOW; }
        if ($win < 1) { $win = self::DEFAULT_WINDOW_SECONDS; }

        $repo  = new RateLimitRepository();
        $count = $repo->countRecent($ip, $action, $win);

        if ($count >= $max) {
            return [
                'allowed'           => false,
                'retryAfterSeconds' => $win,
                'window'            => $win,
            ];
        }

        $repo->mark($ip, $action, $win);
        return [
            'allowed'   => true,
            'remaining' => max(0, $max - $count - 1),
            'window'    => $win,
        ];
    }
}
