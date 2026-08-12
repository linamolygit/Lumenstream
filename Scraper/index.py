import requests
import time

ACCESS_TOKEN = "EAAarINu1n5sBSEdBcqcO3OArbTrz9o0NRH9XlGqt2pnwiYCnYDq2eY6xJ7IFAdqOFQdnT1yUX9F6QoJXLW9ZArxdwRSO45wva4GPK7fr0YcWZCww3k2FGYWjl7ObK7ruZAAHvzkdlmrZB6lJ3CYiJwIOkBdnVidZCBHAHOf7dEGVY6cqoRSUkXxvgMwCTcMET4xgNAV88OOj687AcY8YZCyTcD4KIIM8ZAoPLZArA0xi5EcEEHMEQA4suGbed9to7aNxwdh7c7LP3nYzugZDZD"
AD_ACCOUNT_ID = "act_854376751027084"

URL = f"https://graph.facebook.com/v26.0/{AD_ACCOUNT_ID}/campaigns"

params = {
    "fields": "id,name,status",
    "limit": 25,
    "access_token": ACCESS_TOKEN
}

successful = 0
failed = 0

for i in range(500):
    try:
        response = requests.get(URL, params=params, timeout=30)

        if response.ok:
            successful += 1
            print(f"{i + 1}/500 ✅ Success")
        else:
            failed += 1
            print(f"{i + 1}/500 ❌ Failed: {response.status_code}")
            print(response.text[:300])

    except requests.RequestException as e:
        failed += 1
        print(f"{i + 1}/500 ❌ Request error: {e}")

    time.sleep(0.5)

print("\n===== RESULT =====")
print("Total:", successful + failed)
print("Successful:", successful)
print("Failed:", failed)
print("Success rate:", successful / 500 * 100, "%")