<?php
declare(strict_types=1);

namespace Nexum\Api;

use MongoDB\Client;
use MongoDB\Database;

/**
 * Lazy-loaded singleton MongoDB client.
 *
 * The URI is read from MONGODB_URI (dev vs. prod is a pure env-var switch —
 * no code change). All reads/writes go through self::db(), which selects the
 * database named in MONGODB_DB. Documents are returned as plain PHP arrays
 * via the "root/document/array" type map so controllers never leak BSON
 * objects into JSON responses.
 */
final class Mongo
{
    private static ?Client $client = null;

    public static function client(): Client
    {
        if (self::$client === null) {
            $uri = Config::require('MONGODB_URI');
            self::$client = new Client(
                $uri,
                [], // uri options
                [
                    'typeMap' => [
                        'root'     => 'array',
                        'document' => 'array',
                        'array'    => 'array',
                    ],
                ]
            );
        }
        return self::$client;
    }

    public static function db(): Database
    {
        $name = Config::require('MONGODB_DB');
        return self::client()->selectDatabase($name);
    }

    /**
     * Run a ping against the `admin` database and return {ok, latencyMs}.
     * Used by the health endpoint; a successful ping confirms TLS + auth.
     */
    public static function ping(): array
    {
        $start  = microtime(true);
        $result = self::client()
            ->selectDatabase('admin')
            ->command(['ping' => 1])
            ->toArray();
        $ms = (int) round((microtime(true) - $start) * 1000);
        $ok = isset($result[0]['ok']) && (float) $result[0]['ok'] === 1.0;
        return ['ok' => $ok, 'latencyMs' => $ms];
    }
}
