# Reeve — bank prototype

## Structure
- `reeve/core/` — Django app (models, views, services, statement template)
- `frontend` — frontend, currently a single-file React preview (not yet a Vite/Next project)

## Backend setup
1. `pip install -r reeve-backend/requirements.txt`
2. `python manage.py makemigrations accounts && python manage.py migrate`
3. `python manage.py createsuperuser` (needed for the staff-only institution ledger endpoint)
4. `python manage.py audit_ledger` — reconciliation check, run anytime after test transfers

## Endpoints
- POST `/api/auth/login/`, POST `/api/auth/refresh/`
- GET `/api/accounts/`
- GET `/api/accounts/<id>/`
- GET `/api/accounts/<id>/transactions/?currency=USD`
- GET `/api/accounts/<id>/statement/?currency=USD&from=...&to=...` — PDF download
- POST `/api/transfer/`
- GET `/api/institution/ledger/` — staff only

## Frontend next step
`reeve-frontend App.jsx` needs to become a real Vite (or Next.js) project, with its
components split out and fetch calls added hitting the endpoints above.
