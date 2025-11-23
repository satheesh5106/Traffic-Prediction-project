import os
import json
import time
import requests

BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:3001')
TOKEN_URL = f"{BACKEND_URL}/api/auth/token"
PREDICT_URL = f"{BACKEND_URL}/api/incident/predict"

ADMIN_USER = os.getenv('ADMIN_EMAIL', 'admin@trafficai.com')
ADMIN_PASS = os.getenv('ADMIN_PASSWORD', 'admin123')

TEST_LOCATIONS = [
    'Bengaluru',
    'Chennai',
    'Hyderabad',
    'Mumbai',
]

def get_token():
    # Backend currently bypasses auth; token not required.
    return None

def predict(token, location):
    headers = {}
    payload = {'location': location}
    resp = requests.post(PREDICT_URL, json=payload, headers=headers, timeout=20)
    return resp

def main():
    print("Auth bypass enabled; proceeding without token.")
    token = get_token()

    results = []
    for loc in TEST_LOCATIONS:
        print(f"\nRequesting prediction for: {loc}")
        r = predict(token, loc)
        status = r.status_code
        print(f"Status: {status}")
        try:
            body = r.json()
        except Exception:
            body = {'raw': r.text}
        print(json.dumps(body, indent=2))
        results.append({'location': loc, 'status': status, 'body': body})
        time.sleep(0.8)

    # Summary: check variability or error propagation
    print("\n=== Summary ===")
    normalized = []
    for res in results:
        body = res['body'] or {}
        pred = (body.get('prediction') or {})
        model_info = (body.get('model_info') or {})
        normalized.append({
            'location': res['location'],
            'status': res['status'],
            'predicted_severity': pred.get('severity'),
            'probability': pred.get('probability'),
            'confidence': pred.get('confidence_score'),
            'accuracy_percentage': model_info.get('accuracy'),
            'error': body.get('error'),
            'message': body.get('message'),
        })
    print(json.dumps(normalized, indent=2))

    # Detect identical predictions across locations
    real = [
        (
            n.get('predicted_severity'),
            n.get('probability'),
            n.get('confidence'),
            n.get('accuracy_percentage')
        )
        for n in normalized if n['status'] == 200
    ]
    identical = len(set(real)) == 1 if real else False
    if identical:
        print("\n>>> WARNING: Predictions appear identical across locations. Check backend fallbacks or ML error handling.")
    else:
        print("\n>>> OK: Predictions vary across locations or errors are propagated (strict mode).")

if __name__ == '__main__':
    main()