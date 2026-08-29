
import os
import django
from django.core.management import call_command

# Initialize Django environment variables
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def run_setup():
    print("🚀 Starting automated database initialization...")
    
    # 1. Run migrations against Turso
    print("📦 Running makemigrations and migrate...")
    call_command('makemigrations', '--noinput')
    call_command('migrate', '--noinput')
    
    # 2. Programmatically handle createsuperuser without prompts
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
        print("ℹ️ Superuser already exists. Skipping creation.")

if __name__ == '__main__':
    run_setup()