<?php
declare(strict_types=1);

namespace Nexum\Api\Controllers;

use Nexum\Api\Config;
use Nexum\Api\Mongo;

/**
 * GET /api/health
 *
 * Reports whether the API can authenticate against MongoDB Atlas using the
 * configured URI and whether the configured user has permission to list
 * collections on MONGODB_DB. Response is safe for production: it never
 * leaks the URI, the user, or the raw driver error unless APP_DEBUG=true.
 */
final class HealthController
{
    public function handle(): void
    {
        $mongoState = [
            'connected' => false,
            'database'  => Config::get('MONGODB_DB'),
        ];

        try {
            $ping = Mongo::ping();
            $mongoState['connected'] = $ping['ok'];
            $mongoState['latencyMs'] = $ping['latencyMs'];

            // Also list collections — exercises the user's readWrite grant
            // on MONGODB_DB. Caught separately so a ping-only success still
            // reports correctly if list permission is unexpectedly missing.
            try {
                $collections = [];
                foreach (Mongo::db()->listCollectionNames() as $name) {
                    $collections[] = $name;
                }
                sort($collections);
                $mongoState['collections']     = $collections;
                $mongoState['collectionCount'] = count($collections);
            } catch (\Throwable $e) {
                $mongoState['collectionError'] = Config::isDebug()
                    ? $e->getMessage()
                    : 'Unable to list collections.';
            }
        } catch (\Throwable $e) {
            http_response_code(503);
            $mongoState['error'] = Config::isDebug()
                ? $e->getMessage()
                : 'MongoDB connection failed.';
            error_log(Config::redactSecrets('[api/health] mongo: ' . $e->getMessage()));
        }

        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');

        echo json_encode([
            'ok'  => (bool) $mongoState['connected'],
            'app' => [
                'env'        => Config::get('APP_ENV', 'unknown'),
                'phpVersion' => PHP_VERSION,
                'timestamp'  => gmdate('c'),
            ],
            'mongo' => $mongoState,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    }
}
