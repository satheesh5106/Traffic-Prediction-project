import json

# Mock JSON for display-only output (exactly as provided by user)
MOCK_JSON = """
[
  {
    "region": "Andaman & Nicobar Islands",
    "status": "RED",
    "severity": "Take Action",
    "phenomena": "Heavy to Very Heavy Rainfall, Thunderstorm with Lightning, Gusty Winds 40-50 kmph",
    "day1": { "alert": "Red", "description": "Heavy Rainfall, Thunderstorm" },
    "day2": { "alert": "Red", "description": "Very Heavy Rainfall expected, Strong Winds" },
    "day3": { "alert": "Red", "description": "Heavy Rainfall, Thunderstorm continues" },
    "precautions": [
      "Stay indoors; avoid low-lying, flood-prone areas.",
      "Secure outdoor structures; do not venture during squalls.",
      "Keep emergency supplies ready; charge devices in advance."
    ]
  },
  {
    "region": "Tamil Nadu, Puducherry & Karaikal",
    "status": "RED",
    "severity": "Take Action",
    "phenomena": "Heavy to Very Heavy Rainfall (isolated), Thunderstorm, Gusty Winds 30-40 kmph",
    "day1": { "alert": "Red", "description": "Very Heavy Rainfall at isolated places" },
    "day2": { "alert": "Orange", "description": "Heavy to Very Heavy Rainfall likely" },
    "day3": { "alert": "Yellow", "description": "Isolated Heavy Rainfall" },
    "precautions": [
      "Drain excess water from fields; support horticultural crops against wind damage.",
      "Avoid waterlogged areas; follow traffic advisories.",
      "Stay alert for localized flooding and mudslides in low-lying zones."
    ]
  },
  {
    "region": "Kerala & Mahe",
    "status": "RED",
    "severity": "Take Action",
    "phenomena": "Heavy to Very Heavy Rainfall (isolated), Thunderstorm, Expected rainfall 7-11 cm",
    "day1": { "alert": "Red", "description": "Very Heavy Rainfall at isolated places, Lightning" },
    "day2": { "alert": "Red", "description": "Heavy Rainfall, Thunderstorm with Lightning" },
    "day3": { "alert": "Orange", "description": "Heavy Rainfall, Thunderstorm continues" },
    "precautions": [
      "Ensure drainage in fields and plantations; stake vegetables to prevent lodging.",
      "Avoid swollen water bodies; stay indoors during thunderstorms.",
      "Keep livestock sheltered; store feed safely to prevent spoilage."
    ]
  },
  {
    "region": "Lakshadweep",
    "status": "ORANGE",
    "severity": "Be Prepared",
    "phenomena": "Heavy Rainfall (23 Nov), Thunderstorm with Lightning",
    "day1": { "alert": "Orange", "description": "Heavy Rainfall at isolated places" },
    "day2": { "alert": "Orange", "description": "Thunderstorm with Lightning" },
    "day3": { "alert": "Yellow", "description": "Scattered Thunderstorm" },
    "precautions": [
      "Avoid sea travel and outdoor activities during thunderstorms.",
      "Secure loose structures; monitor daily weather updates.",
      "Expect ferry disruptions; plan alternative transport routes."
    ]
  },
  {
    "region": "Coastal Andhra Pradesh & Yanam",
    "status": "YELLOW",
    "severity": "Be Aware",
    "phenomena": "Heavy Rainfall (isolated), Thunderstorm with Lightning (23-24 Nov)",
    "day1": { "alert": "Yellow", "description": "Heavy Rainfall at isolated places, Lightning" },
    "day2": { "alert": "Yellow", "description": "Heavy Rainfall, Thunderstorm" },
    "day3": { "alert": "Green", "description": "No significant weather" },
    "precautions": [
      "Remain alert for minor urban flooding in low-lying areas.",
      "Avoid standing under trees; stay away from electrical equipment during storms.",
      "Monitor IMD alerts for any warning escalation."
    ]
  },
  {
    "region": "Bay of Bengal & Andaman Sea (Marine)",
    "status": "RED",
    "severity": "Take Action - Marine",
    "phenomena": "Squally weather, Wind 40-65 kmph gusting, Rough to Very Rough Seas, Developing Cyclonic System",
    "day1": { "alert": "Red", "description": "Squally weather; Fishermen warned" },
    "day2": { "alert": "Red", "description": "Strong winds 40-55 kmph; Very Rough Seas" },
    "day3": { "alert": "Red", "description": "Continuing squally conditions" },
    "precautions": [
      "Fishermen MUST NOT venture into Bay of Bengal & Andaman Sea.",
      "All vessels: operate only from protected harbors; avoid open waters.",
      "Maintain continuous radio contact with coast guard; monitor marine forecasts hourly."
    ]
  }
]
"""

def display_mock_data():
    """Print the provided mock JSON exactly, with pretty formatting."""
    data = json.loads(MOCK_JSON)
    print(json.dumps(data, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    # Only display the provided mock data; no extra info
    display_mock_data()
