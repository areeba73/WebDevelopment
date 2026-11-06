<?php
declare(strict_types=1);

namespace Nexum\Api\Repositories;

use MongoDB\BSON\UTCDateTime;
use MongoDB\Collection;
use Nexum\Api\Mongo;

/**
 * Data access for the `inquiries` collection.
 *
 * Document shape:
 * {
 *   _id, createdAt, source: "contact-form",
 *   name, email, phone?, company?,
 *   service?, serviceIsKnown?,
 *   message,
 *   status: "new" | "in_progress" | "replied" | "closed",
 *   notes: [], tags: [],
 *   emails: { notificationSent: bool, autoreplySent: bool },   // Phase 3
 *   meta: { ip, userAgent, referrer }
 * }
 *
 * Indexes:
 *   - { createdAt:-1 }                    newest-first admin listing (Phase 4)
 *   - { status:1, createdAt:-1 }          status queues (Phase 4)
 *   - { email:1 }                         dedupe / lookup
 */
final class InquiryRepository
{
    private Collection $col;
    private static bool $indexesEnsured = false;

    public function __construct()
    {
        $this->col = Mongo::db()->selectCollection('inquiries');
        if (!self::$indexesEnsured) {
            $this->ensureIndexes();
            self::$indexesEnsured = true;
        }
    }

    private function ensureIndexes(): void
    {
        $this->col->createIndex(['createdAt' => -1], ['name' => 'createdAt_desc']);
        $this->col->createIndex(['status' => 1, 'createdAt' => -1], ['name' => 'status_createdAt']);
        $this->col->createIndex(['email' => 1], ['name' => 'email_asc']);
    }

    /**
     * Insert a cleaned, validated inquiry and return its _id as a hex string.
     *
     * @param array<string,mixed> $normalized  output of ContactInput::validateAndNormalize()['data']
     * @param array<string,mixed> $meta        { ip, userAgent, referrer }
     */
    public function insert(array $normalized, array $meta): string
    {
        $doc = [
            'createdAt'        => new UTCDateTime(time() * 1000),
            'source'           => 'contact-form',
            'name'             => (string) $normalized['name'],
            'email'            => (string) $normalized['email'],
            'phone'            => $normalized['phone']            ?? null,
            'company'          => $normalized['company']          ?? null,
            'service'          => $normalized['service']          ?? null,
            'serviceIsKnown'   => $normalized['serviceIsKnown']   ?? null,
            'message'          => (string) $normalized['message'],
            'status'           => 'new',
            'notes'            => [],
            'tags'             => [],
            'emails'           => [
                'notificationSent' => false,
                'autoreplySent'    => false,
            ],
            'meta' => [
                'ip'        => (string) ($meta['ip']        ?? ''),
                'userAgent' => (string) ($meta['userAgent'] ?? ''),
                'referrer'  => (string) ($meta['referrer']  ?? ''),
            ],
        ];

        $result = $this->col->insertOne($doc);
        return (string) $result->getInsertedId();
    }
}
