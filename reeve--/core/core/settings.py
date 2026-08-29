from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-$hb@@7=r6jd=%%8vxf14zwc(nri3%8y9d#yosd1$u&ul=i5ufp'

DEBUG = True

ALLOWED_HOSTS = ['*']

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'app',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # Placed before CommonMiddleware
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],  # Fixed duplicate key issue
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# CORS_ALLOWED_ORIGINS = [
#     "http://localhost:3000",
#     "http://localhost:5173", "*"
# ]


CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

WSGI_APPLICATION = 'core.wsgi.application'

# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.sqlite3',
#         'NAME': BASE_DIR / 'db.sqlite3',
#     }
# }

# import os

# DATABASES = {
#     'default': {
#         'ENGINE': 'django_libsql',
#         'NAME': os.environ.get("TURSO_DATABASE_URL"),
#         'AUTH_TOKEN': os.environ.get("TURSO_AUTH_TOKEN"),
#         # CRUCIAL FOR SERVERLESS NETWORKS: Keep connections open for 10 minutes (600 seconds)
#         # This reduces connection overhead and speeds up response times significantly.
#         'CONN_MAX_AGE': 600, 
        
#     }
# }
import os

# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.postgresql',
#         'NAME': os.environ.get('DB_NAME', 'Reeve'),
#         'USER': os.environ.get('DB_USER', 'postgres.fzdyjdfpcrvtrnyrenem'),
#         'PASSWORD': os.environ.get('tumwuz-wenkez-4jyvqU'),
#         'HOST': os.environ.get('aws-1-eu-west-1.pooler.supabase.com'),
#         'PORT': os.environ.get('DB_PORT', '6543'),
#         'OPTIONS': {
#             'sslmode': 'require',
#         },
#     }
# }

import os
from pathlib import Path

# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.postgresql',
#         'NAME': os.environ.get('DB_NAME', 'postgres'),
#         'USER': os.environ.get('DB_USER', 'postgres'),
#         'PASSWORD': os.environ.get('DB_PASSWORD', ''),
#         'HOST': os.environ.get('DB_HOST', ''),
#         'PORT': os.environ.get('DB_PORT', '6543'),
#     }
# }
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'postgres',
        'USER': 'postgres.fzdyjdfpcrvtrnyrenem',
        'PASSWORD': 'tumwuz-wenkez-4jyvqU',
        'HOST': 'aws-1-eu-west-1.pooler.supabase.com',
        'PORT': '6543',
    }
}



AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'


AUTH_USER_MODEL = 'auth.User' 