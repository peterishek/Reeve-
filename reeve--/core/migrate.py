
import os
import sys
import django
from django.core.management import call_command

# Add your project directory (e.g., 'core' or whatever your inner folder is named) to Python's path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()


def run_setup():
    print("🚀 Starting automated database initialization...")
    
    try:
        # ONLY run migrate. Do NOT run makemigrations here.
        print("📦 Applying existing migrations to Turso...")
        call_command('migrate', '--noinput')
        print("✅ Migrations applied successfully!")
    except Exception as db_err:
        print(f"⚠️ Migration skip/fail (likely database locked or already migrated): {db_err}")
    
    # Handle creating the superuser programmatically
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
    email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
    password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'DefaultSecurePass123!')
    
    if not User.objects.filter(username=username).exists():
        print(f"👤 Creating superuser account: {username}...")
        User.objects.create_superuser(username=username, email=email, password=password)
        print("✅ Superuser created successfully!")
    else:
        print("ℹ️ Superuser already exists. Skipping.")

if __name__ == '__main__':
    run_setup()