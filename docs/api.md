# REST API reference (v0.1)

Base: same-origin `http://localhost:8080/api` (or your TLS proxy origin). All endpoints except `POST /auth/login` require `Authorization: Bearer <access_token>`.

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Email and password → `access_token` |
| GET | `/auth/me` | Any authenticated | Signed-in account |
| GET | `/dashboard/summary` | Any authenticated | Aggregate metrics + 7-day trends + recent anonymized operations |
| POST | `/ocr/predict` | Admin/operator | In-memory raw binary JPEG/PNG/WebP → plate readings |
| GET | `/settings` | Any authenticated | Current OCR settings |
| PUT | `/settings` | Admin | Replace settings |
| GET | `/users` | Admin | List user accounts |
| POST | `/users` | Admin | Create account |
| PATCH | `/users/{id}` | Admin | Modify account / reset password |
| DELETE | `/users/{id}` | Admin | Remove account (self and last-admin protected) |

### `POST /auth/login`

```json
{"email":"admin@example.local", "password":"..."}
```

Returns JSON `{"access_token":"<JWT>","token_type":"bearer"}`. Tokens expire in `JWT_EXPIRE_MINUTES` (default 60). Passwords must have at least 12 characters for new users and bootstrap. Passwords are stored as Argon2id hashes.

### `POST /ocr/predict`

Send the **whole file as the binary HTTP request body**, **not multipart/form-data**. Headers: `Authorization` and `Content-Type: image/jpeg|image/png|image/webp`. Hard size cap is `MAX_UPLOAD_MB` in the API environment, with an adjustable admin cap below it. Max decoded image dimensions are limited by `MAX_IMAGE_PIXELS`.

Example response (illustrative schema, not a model accuracy claim):

```json
{
  "width": 1920,
  "height": 1080,
  "duration_ms": 147,
  "plate_count": 1,
  "plates": [
    {
      "text": "59A12345",
      "detection_confidence": 0.94,
      "ocr_confidence": 0.91,
      "bbox": {"x": 615, "y": 532, "width": 265, "height": 87},
      "character_confidences": [
        {"character":"5", "confidence":0.97},
        {"character":"9", "confidence":0.96}
      ],
      "region": null
    }
  ]
}
```

`character_confidences` is either one value per recognized character **when provided by the model and aligned**, or an empty array. These scores are *not* character-level bounding boxes. `bbox` is an actual plate detection rectangle in original image pixels (after EXIF orientation correction). `text` may be empty when OCR confidence is below the threshold; a detection can still be returned.

### `PUT /settings`

```json
{
  "detection_threshold": 0.4,
  "ocr_threshold": 0.3,
  "max_upload_mb": 8,
  "save_operation_metadata": true
}
```

Thresholds are probability fractions (0–1); detection minimum 0.2 is the underlying model's fixed inference floor. OCR minimum is 0. For the UI, both are shown as percentages. The max file size is bounded by the hard server cap.

### `POST /users`

```json
{
  "email": "operator@example.local",
  "full_name": "Example Operator",
  "password": "UseAVeryStrongPassword",
  "role": "operator",
  "is_active": true
}
```

`PATCH /users/{id}` accepts any subset of those fields, with password optional. Roles: `admin`, `operator`, `viewer`. Disabled accounts and accounts deleted after token issuance are rejected by the authorization dependency.

### Standard error responses

- `400`: empty body, malformed HTTP content length
- `401`: missing/invalid/expired token or invalid credentials
- `403`: insufficient role
- `409`: duplicate email, deletion/admin safety constraints
- `413`: request too large
- `415`: wrong MIME type
- `422`: invalid image or settings validation issue
- `429`: excessive sign-in attempts (per API instance)
- `503`: model inference failed or model unavailable

OCR payloads are discarded after processing and never included in API logs. Image response caching is disabled.
