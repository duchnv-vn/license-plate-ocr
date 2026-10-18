"""Opt-in ALPR end-to-end test with a local image (does not write image data)."""
import argparse
import json
import mimetypes
import urllib.error
import urllib.request
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--base", default="http://localhost:8080")
parser.add_argument("--email", required=True)
parser.add_argument("--image", type=Path, required=True)
args = parser.parse_args()
from getpass import getpass
password = getpass("Password: ")


def call(path, body, headers):
    req = urllib.request.Request(args.base.rstrip("/") + path, data=body, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=180) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        raise SystemExit(f"HTTP {exc.code}: {exc.read()[:400].decode(errors='replace')}") from None


token = call("/api/auth/login", json.dumps({"email": args.email, "password": password}).encode(),
             {"Content-Type": "application/json"})["access_token"]
media_type = mimetypes.guess_type(args.image.name)[0] or "application/octet-stream"
if media_type not in {"image/jpeg", "image/png", "image/webp"}:
    raise SystemExit("Use a JPEG, PNG or WebP image")
result = call("/api/ocr/predict", args.image.read_bytes(),
              {"Authorization": f"Bearer {token}", "Content-Type": media_type})
print(json.dumps(result, indent=2))
