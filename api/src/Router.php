<?php
declare(strict_types=1);

namespace Nexum\Api;

use Nexum\Api\Controllers\ContactController;
use Nexum\Api\Controllers\HealthController;

/**
 * Minimal method+path dispatcher.
 *
 * New endpoints register as explicit (method, path, handler) rows. We stay
 * framework-free: no PSR-7, no middleware stack, no reflection.
 */
final class Router
{
    public function dispatch(string $method, string $path): void
    {
        // Normalise: strip trailing slash (except root)
        $path = $path === '/' ? '/' : rtrim($path, '/');

        $method = strtoupper($method);

        $routes = [
            // Phase 1
            ['GET',  '/api/health',  fn() => (new HealthController())->handle()],
            // Phase 2
            ['POST', '/api/contact', fn() => (new ContactController())->handle()],
        ];

        $allowedMethodsForPath = [];
        foreach ($routes as [$m, $p, $handler]) {
            if ($p === $path) {
                $allowedMethodsForPath[] = $m;
                if ($m === $method) {
                    $handler();
                    return;
                }
            }
        }

        if ($allowedMethodsForPath !== []) {
            $this->methodNotAllowed($allowedMethodsForPath);
            return;
        }

        $this->notFound();
    }

    /** @param list<string> $allowed */
    private function methodNotAllowed(array $allowed): void
    {
        header('Allow: ' . implode(', ', $allowed));
        http_response_code(405);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode(
            [
                'ok'      => false,
                'error'   => 'method_not_allowed',
                'message' => 'Allowed methods: ' . implode(', ', $allowed) . '.',
            ],
            JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
        );
    }

    private function notFound(): void
    {
        http_response_code(404);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode(
            ['ok' => false, 'error' => 'not_found'],
            JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
        );
    }
}
