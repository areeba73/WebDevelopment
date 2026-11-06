<?php
declare(strict_types=1);

/**
 * Nexum Global Solutions — API front controller.
 *
 * Every request that isn't a real file/dir under /public is routed here by
 * .htaccess (or the equivalent nginx rule). This file wires up config, error
 * handling, security headers, CORS, then hands off to the Router.
 */

// ── Dependencies ──────────────────────────────────────────────────────────
$autoload = __DIR__ . '/../vendor/autoload.php';
if (!is_file($autoload)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'ok'    => false,
        'error' => 'dependencies_missing',
        'hint'  => 'Run "composer install" inside the api/ directory.',
    ], JSON_PRETTY_PRINT);
    exit;
}
require $autoload;

use Nexum\Api\Config;
use Nexum\Api\Router;

// Any boot-time or dispatch error yields a clean JSON 500 — never a blank
// page, never a PHP stack trace leaked to the browser.
$debug = false; // resolved after Config::load() succeeds

try {
    // ── Environment ───────────────────────────────────────────────────────
    Config::load(dirname(__DIR__));
    $debug = Config::isDebug();

    // Errors: show nothing to clients in production; log everything.
    error_reporting(E_ALL);
    ini_set('display_errors', $debug ? '1' : '0');
    ini_set('log_errors', '1');

    $logDir = dirname(__DIR__) . '/logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0770, true);
    }
    if (is_dir($logDir) && is_writable($logDir)) {
        ini_set('error_log', $logDir . '/php-error.log');
    }

    // ── Security headers (always) ─────────────────────────────────────────
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
    header_remove('X-Powered-By');

    // ── CORS (dynamic allow-list) ─────────────────────────────────────────
    $origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = array_filter(array_map(
        'trim',
        explode(',', (string) Config::get('CORS_ALLOWED_ORIGINS', ''))
    ));

    if ($origin !== '' && in_array($origin, $allowed, true)) {
        header("Access-Control-Allow-Origin: $origin");
        header('Vary: Origin');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
        header('Access-Control-Max-Age: 600');
    }

    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if ($method === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    // ── Dispatch ──────────────────────────────────────────────────────────
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    (new Router())->dispatch($method, $path);
} catch (\Throwable $e) {
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
    }
    echo json_encode([
        'ok'      => false,
        'error'   => 'internal_error',
        'message' => $debug ? $e->getMessage() : 'An unexpected error occurred.',
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    error_log(Config::redactSecrets(sprintf(
        "[api] %s: %s in %s:%d\n%s",
        get_class($e),
        $e->getMessage(),
        $e->getFile(),
        $e->getLine(),
        $e->getTraceAsString()
    )));
}
