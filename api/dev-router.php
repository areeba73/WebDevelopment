<?php
declare(strict_types=1);

/**
 * Dev-only router for PHP's built-in server.
 *
 * Used when a single `php -S 0.0.0.0:8000 -t <project-root> <this file>`
 * command needs to serve both the static frontend and the PHP API from
 * the same localhost origin. Not loaded in production.
 *
 * Request flow:
 *   /.env, /.git/..., any dotfile       -> 404
 *   /api/vendor|src|logs/...            -> 404
 *   /api/composer.*, Dockerfile, README -> 404
 *   /api/...                            -> delegate to api/public/index.php
 *   everything else                     -> let PHP serve the static file
 *                                          from the docroot; PHP emits
 *                                          its own 404 if it's missing.
 */

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

/**
 * Explicit deny-list. Even though the API front controller would 404
 * any /api/* path that isn't a registered route — and PHP's built-in
 * server would try to serve static files from the docroot otherwise —
 * we short-circuit here with a JSON 404 so that private files are
 * unreachable by any path, with or without PHP internals changing
 * someday.
 */
$deny = [
    '#(^|/)\.[^/]+#',                                    // ANY dotfile/dotdir at any depth: /.env, /.git/HEAD, /path/.foo
    '#^/api/(vendor|src|logs)(/|$)#',                    // backend internals
    '#^/api/(composer\.(json|lock)|Dockerfile|README\.md|dev-router\.php)$#i',  // build/dev artefacts
];

foreach ($deny as $pattern) {
    if (preg_match($pattern, $path)) {
        http_response_code(404);
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: no-store');
        echo '{"ok":false,"error":"not_found"}';
        return true;
    }
}

// Delegate every /api/* path to the real front controller. From its
// point of view the request looks identical to a production Apache
// setup — same $_SERVER, same method, same body.
if ($path === '/api' || str_starts_with($path, '/api/')) {
    chdir(__DIR__ . '/public');
    require __DIR__ . '/public/index.php';
    return true;
}

// Static files: only return false (= let PHP's built-in server serve
// from the docroot) when the request resolves to a real file (or a
// directory that has an index.html) INSIDE the docroot. Anything else
// is an explicit 404 — this avoids PHP's quirk of returning HTTP 200
// with an empty body when the router returns false for a path that
// has no backing resource.
$docroot     = $_SERVER['DOCUMENT_ROOT'] ?? '';
$docrootReal = $docroot !== '' ? realpath($docroot) : false;

if ($docrootReal !== false) {
    // Directory-style request ("/", "/subdir/") -> look for index.html.
    // If one exists we return false and PHP serves it.
    if ($path === '/' || str_ends_with($path, '/')) {
        if (is_file($docrootReal . $path . 'index.html')) {
            return false;
        }
    } else {
        $real = realpath($docrootReal . $path);
        if (
            $real !== false
            && (
                $real === $docrootReal
                || str_starts_with($real, $docrootReal . DIRECTORY_SEPARATOR)
            )
            && is_file($real)
        ) {
            return false;
        }
    }
}

// Missing file or traversal attempt — plain JSON 404.
http_response_code(404);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
echo '{"ok":false,"error":"not_found"}';
return true;
