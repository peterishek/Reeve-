"""
WSGI config for core project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.1/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Execute database migrations and superuser setup instantly upon container spin-up
try:
    import migrate
    migrate.run_setup()
except Exception as e:
    print(f"❌ Migration script failed: {e}")

application = get_wsgi_application()
app = application