<?php
declare(strict_types=1);

namespace Nexum\Api\Repositories;

use MongoDB\BSON\UTCDateTime;
use MongoDB\Collection;
use Nexum\Api\Mongo;

/**
 * Data access for the `rate_limits` collection.
 *
 * Shape: { ip, action, createdAt, expiresAt }
 * Indexes:
 *   - { ip:1, action:1, createdAt:-1 }  for window counts
 *   - { expiresAt:1 } TTL                for automatic cleanup
 *
 * One document is written per rate-limited action attempt, and old
 * documents vanish on their own via the TTL index. This avoids the race
 * windows an increment-counter approach would need to defend against.
 */
final class RateLimitRepository
{
    private Collection $col;
    private static bool $indexesEnsured = false;

    public function __construct()
    {
        $this->col = Mongo::db()->selectCollection('rate_limits');
        if (!self::$indexesEnsured) {
            $this->ensureIndexes();
            self::$indexesEnsured = true;
        }
    }

    /** `createIndex` is idempotent — safe to call on boot. */
    private function ensureIndexes(): void
    {
        $this->col->createIndex(
            ['ip' => 1, 'action' => 1, 'createdAt' => -1],
            ['name' => 'ip_action_createdAt']
        );
        $this->col->createIndex(
            ['expiresAt' => 1],
            ['name' => 'ttl_expiresAt', 'expireAfterSeconds' => 0]
        );
    }

    /**
     * Count attempts for (ip, action) within the last $windowSeconds.
     */
    public function countRecent(string $ip, string $action, int $windowSeconds): int
    {
        $cutoff = new UTCDateTime((time() - $windowSeconds) * 1000);
        return $this->col->countDocuments([
            'ip'        => $ip,
            'action'    => $action,
            'createdAt' => ['$gte' => $cutoff],
        ]);
    }

    /**
     * Record a single attempt. TTL cleans it up automatically.
     */
    public function mark(string $ip, string $action, int $windowSeconds): void
    {
        $now = time();
        $this->col->insertOne([
            'ip'        => $ip,
            'action'    => $action,
            'createdAt' => new UTCDateTime($now * 1000),
            'expiresAt' => new UTCDateTime(($now + $windowSeconds) * 1000),
        ]);
    }
}
