"""Fill empty secrets in .env without exposing secrets in source control."""
import secrets
import os
from pathlib import Path

path = Path(__file__).resolve().parents[1] / '.env'
if not path.exists():
    raise SystemExit('Copy .env.example to .env first.')
lines = path.read_text().splitlines()
new_lines = []
created = {}
for line in lines:
    if '=' in line and not line.strip().startswith('#'):
        key, val = line.split('=', 1)
        if key in {'POSTGRES_PASSWORD', 'JWT_SECRET', 'BOOTSTRAP_ADMIN_PASSWORD'} and not val.strip():
            val = secrets.token_urlsafe(36) if key == 'JWT_SECRET' else secrets.token_hex(20)
            created[key] = val
            line = key + '=' + val
    new_lines.append(line)
path.write_text('\n'.join(new_lines) + '\n')
os.chmod(path, 0o600)
print('Configured .env and restricted its Unix permissions (0600).')
if created:
    print('Save these values in your secrets manager:')
    for key, val in created.items():
        print(f'{key}={val}')
else:
    print('No blank secret values found. Existing secrets were kept unchanged.')
