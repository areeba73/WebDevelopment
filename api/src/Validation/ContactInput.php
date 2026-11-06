<?php
declare(strict_types=1);

namespace Nexum\Api\Validation;

/**
 * Server-side validation + sanitization for the contact form.
 *
 * Input is the raw associative array parsed from the request body. Output
 * is either a clean, trusted array ready for MongoDB, or a map of
 * field-level errors suitable for a 422 response.
 *
 * Field name compatibility: the current frontend uses "website-type"
 * (service) and "details" (message). This validator accepts both the
 * HTML form names and the clean semantic names, so a future frontend
 * wiring (JSON POST) can drop in without changing the server.
 */
final class ContactInput
{
    /** Known service values from the contact form dropdown. */
    public const SERVICES = [
        'WordPress',
        'Custom Web Development',
        'E-Commerce',
        'Landing Page',
        'Redesign',
        'Not sure yet',
    ];

    /**
     * @return array{data: array<string,mixed>, errors: array<string,string>}
     */
    public static function validateAndNormalize(array $raw): array
    {
        $errors = [];
        $data   = [];

        // name — required, 1–80 chars after cleanup
        $name = self::cleanLine($raw['name'] ?? '');
        if ($name === '') {
            $errors['name'] = 'Please enter your name.';
        } elseif (mb_strlen($name) < 2) {
            $errors['name'] = 'Name is too short.';
        } elseif (mb_strlen($name) > 80) {
            $errors['name'] = 'Name is too long (maximum 80 characters).';
        } else {
            $data['name'] = $name;
        }

        // email — required, RFC + length
        $email = trim((string) ($raw['email'] ?? ''));
        if ($email === '') {
            $errors['email'] = 'Please enter your email.';
        } elseif (mb_strlen($email) > 254 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $errors['email'] = 'Please enter a valid email.';
        } else {
            $data['email'] = strtolower($email);
        }

        // phone — optional, loose
        $phone = self::cleanLine($raw['phone'] ?? '');
        if ($phone !== '') {
            if (mb_strlen($phone) > 32) {
                $errors['phone'] = 'Phone number is too long.';
            } elseif (preg_match('/^[\d +()\-.\sxX]+$/', $phone) !== 1) {
                $errors['phone'] = 'Phone number contains invalid characters.';
            } else {
                $data['phone'] = $phone;
            }
        }

        // company — optional
        $company = self::cleanLine($raw['company'] ?? '');
        if ($company !== '') {
            if (mb_strlen($company) > 120) {
                $errors['company'] = 'Company name is too long.';
            } else {
                $data['company'] = $company;
            }
        }

        // service — optional; accepts "service" or legacy "website-type"
        $service = self::cleanLine($raw['service'] ?? $raw['website-type'] ?? '');
        if ($service !== '') {
            if (mb_strlen($service) > 60) {
                $errors['service'] = 'Service name is too long.';
            } else {
                // We accept any <=60 char string so the dropdown can grow
                // without a server-side deploy, but flag unknowns on the doc.
                $data['service']        = $service;
                $data['serviceIsKnown'] = in_array($service, self::SERVICES, true);
            }
        }

        // message — required 10–4000 chars; accepts "message" or legacy "details"
        $message = self::cleanMultiline($raw['message'] ?? $raw['details'] ?? '');
        if ($message === '') {
            $errors['message'] = 'Please add a few details about your project.';
        } elseif (mb_strlen($message) < 10) {
            $errors['message'] = 'Please add a little more detail (minimum 10 characters).';
        } elseif (mb_strlen($message) > 4000) {
            $errors['message'] = 'Message is too long (maximum 4000 characters).';
        } else {
            $data['message'] = $message;
        }

        return ['data' => $data, 'errors' => $errors];
    }

    /**
     * Clean a single-line string: UTF-8 only, control chars stripped,
     * HTML tags stripped, internal whitespace collapsed, trimmed.
     */
    private static function cleanLine(mixed $v): string
    {
        if (!is_string($v)) {
            return '';
        }
        // Normalise line endings (shouldn't occur in a single-line field)
        $v = str_replace(["\r\n", "\r"], "\n", $v);
        // Drop ASCII control chars (keep tab? no — single-line field)
        $v = preg_replace('/[\x00-\x1F\x7F]/u', '', $v) ?? '';
        // Belt-and-braces: strip anything HTML-looking (stored raw, not rendered)
        $v = strip_tags($v);
        // Collapse runs of whitespace
        $v = preg_replace('/\s+/u', ' ', $v) ?? '';
        return trim($v);
    }

    /**
     * Clean a multi-line string: preserve newlines and tabs; strip other
     * control chars and HTML; trim surrounding whitespace.
     */
    private static function cleanMultiline(mixed $v): string
    {
        if (!is_string($v)) {
            return '';
        }
        $v = str_replace(["\r\n", "\r"], "\n", $v);
        // Strip control chars except \n (0x0A) and \t (0x09)
        $v = preg_replace('/[\x00-\x08\x0B-\x1F\x7F]/u', '', $v) ?? '';
        $v = strip_tags($v);
        return trim($v);
    }
}
