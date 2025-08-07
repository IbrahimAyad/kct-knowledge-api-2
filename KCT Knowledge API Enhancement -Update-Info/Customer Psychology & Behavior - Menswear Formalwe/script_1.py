# Create a summary data table for the research findings
import pandas as pd

# Create comprehensive summary data
data = {
    'Metric': [
        'Average Weekly Online Shopping Time',
        'Peak Online Shopping Hours',
        'Cart Abandonment Rate (General)',
        'Cart Abandonment Rate (Luxury/Formalwear)',
        'Optimal Browsing Duration',
        'Critical Decision Fatigue Point',
        'Severe Abandonment Threshold',
        'Optimal Product Options',
        'Choice Overload Threshold',
        'Decision Time Increase (3 vs 60 options)',
        'Optimal Personalized Recommendations',
        'Personalized vs Generic Advantage',
        'Cognitive Overload Point',
        'Optimal Recovery Break Duration',
        'Decision Quality Improvement',
        'Time to Abandonment Email',
        'Shipping Expectation (Standard)',
        'Mobile Shopping Growth'
    ],
    'Value': [
        '62 minutes',
        '1-2 PM',
        '70-75%',
        '81%',
        '5-15 minutes',
        '25-30 minutes',
        '45+ minutes',
        '9-12 options',
        '24+ options',
        '340% increase',
        '4-5 items',
        '15-20% higher',
        '7-9 options',
        '15 minutes',
        '82% quality score',
        '1 hour',
        '2-3 days',
        '52% increase'
    ],
    'Key Insight': [
        'Consumers spend ~54 hours annually shopping online',
        'Lunchtime browsing dominates during workdays',
        'Nearly 3 out of 4 carts are abandoned',
        'Formalwear has highest abandonment rates',
        'Sweet spot for purchase likelihood 70-80%',
        'Abandonment rate jumps to 52% after this point',
        'Abandonment rate exceeds 65% beyond this threshold',
        'Peak conversion rate of 45% achieved',
        'Severe choice paralysis sets in',
        'Decision complexity scales dramatically',
        'Maximum effectiveness of 85% achieved',
        'Personalization significantly outperforms generic',
        'Shoppers experience measurable fatigue',
        'Peak decision quality restoration point',
        'Substantial cognitive performance recovery',
        'Optimal first recovery email timing',
        'Consumer delivery expectations baseline',
        'Post-pandemic behavioral shift acceleration'
    ]
}

# Create DataFrame
df = pd.DataFrame(data)

# Save as CSV
df.to_csv('menswear_decision_fatigue_summary.csv', index=False)

print("COMPREHENSIVE RESEARCH SUMMARY - MENSWEAR FORMALWEAR DECISION FATIGUE")
print("="*75)
print()

# Display key findings by category
categories = {
    'BROWSING BEHAVIOR PATTERNS': [0, 1, 4, 5, 6],
    'CHOICE ARCHITECTURE IMPACT': [7, 8, 9, 12],
    'RECOMMENDATION OPTIMIZATION': [10, 11],
    'CART ABANDONMENT DYNAMICS': [2, 3, 15],
    'COGNITIVE RECOVERY FACTORS': [13, 14],
    'MARKET CONTEXT': [16, 17]
}

for category, indices in categories.items():
    print(f"{category}:")
    print("-" * len(category))
    for i in indices:
        print(f"• {df.loc[i, 'Metric']}: {df.loc[i, 'Value']}")
        print(f"  → {df.loc[i, 'Key Insight']}")
        print()
    print()

# Create decision fatigue threshold analysis
print("DECISION FATIGUE THRESHOLD ANALYSIS")
print("="*40)

thresholds = [
    ("Optimal Performance Zone", "0-15 minutes", "70-85% purchase likelihood"),
    ("Warning Zone", "15-25 minutes", "65-70% purchase likelihood"),
    ("Fatigue Zone", "25-45 minutes", "35-65% purchase likelihood"),
    ("Critical Zone", "45-90 minutes", "15-35% purchase likelihood"),
    ("Abandonment Zone", "90+ minutes", "<15% purchase likelihood")
]

for zone, duration, performance in thresholds:
    print(f"{zone:20} | {duration:15} | {performance}")

print()
print("RECOMMENDED INTERVENTION STRATEGIES BY ZONE:")
print("-" * 50)
interventions = [
    ("Optimal Zone", "Maintain momentum, show related products"),
    ("Warning Zone", "Implement gentle guidance, highlight popular choices"),
    ("Fatigue Zone", "Trigger break suggestions, simplify options"),
    ("Critical Zone", "Save cart prompts, exit intent interventions"),
    ("Abandonment Zone", "Recovery emails, personalized return offers")
]

for zone, strategy in interventions:
    print(f"• {zone}: {strategy}")

print()
print(f"Data exported to: menswear_decision_fatigue_summary.csv")
print(f"Total data points analyzed: {len(df)} key metrics")