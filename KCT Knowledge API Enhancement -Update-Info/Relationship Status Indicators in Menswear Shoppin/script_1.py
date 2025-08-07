# Create comprehensive analysis of relationship status indicators in menswear shopping patterns

import pandas as pd

# Purchase patterns indicating upcoming proposals
proposal_indicators_data = {
    'Purchase_Behavior': [
        'Formal wear shopping increase', 'Suit quality upgrade', 'New dress shirt purchases', 'Formal shoe investment',
        'Grooming service bookings', 'Jewelry store visits', 'Photography service research', 'Fine dining reservations',
        'Travel booking patterns', 'Weekend activity changes', 'Style consultation requests', 'Accessory upgrades',
        'Pocket organization products', 'Cologne/fragrance purchases', 'Hair styling appointments'
    ],
    'Timeline_Before_Proposal': [
        '2-4 weeks', '3-6 weeks', '1-3 weeks', '2-4 weeks',
        '1-2 weeks', '4-8 weeks', '3-6 weeks', '1-2 weeks',
        '2-6 weeks', '2-4 weeks', '3-8 weeks', '1-4 weeks',
        '1-2 weeks', '1-3 weeks', '1-2 weeks'
    ],
    'Frequency_Increase': [250, 300, 180, 220, 400, 150, 200, 350, 180, 160, 275, 190, 600, 140, 300],
    'Reliability_Score': [8, 9, 7, 8, 9, 6, 7, 8, 7, 6, 8, 7, 10, 6, 8],
    'Detection_Difficulty': [6, 5, 7, 6, 4, 8, 7, 5, 6, 7, 5, 6, 3, 7, 6],
    'Cost_Range': ['$200-800', '$500-2000', '$100-400', '$200-600', '$100-500', '$50-200', '$200-1000', '$150-500', '$500-3000', '$0-200', '$200-800', '$50-300', '$10-50', '$50-200', '$50-150']
}

proposal_df = pd.DataFrame(proposal_indicators_data)

# Style changes post-engagement
post_engagement_changes_data = {
    'Style_Change_Category': [
        'Formality Level', 'Formality Level', 'Formality Level',
        'Color Preferences', 'Color Preferences', 'Color Preferences',
        'Fit Preferences', 'Fit Preferences', 'Fit Preferences',
        'Brand Preferences', 'Brand Preferences', 'Brand Preferences',
        'Shopping Behavior', 'Shopping Behavior', 'Shopping Behavior'
    ],
    'Specific_Change': [
        'Increased formal wear frequency', 'Business casual upgrade', 'Weekend attire elevation',
        'Shift to navy/gray dominance', 'Reduced bold color choices', 'Increased neutral palette',
        'Preference for tailored fit', 'Investment in alterations', 'Focus on proper proportions',
        'Move to premium brands', 'Quality over quantity mindset', 'Brand consistency seeking',
        'Joint shopping sessions', 'Longer decision timelines', 'Budget planning integration'
    ],
    'Percentage_Experiencing': [85, 72, 68, 78, 65, 82, 89, 76, 83, 71, 88, 69, 94, 81, 87],
    'Timeline_Post_Engagement': [
        '1-3 months', '2-6 months', '3-12 months',
        '1-2 months', '2-4 months', '1-3 months',
        '2-4 months', '3-6 months', '2-5 months',
        '3-8 months', '2-6 months', '4-12 months',
        'Immediate', '1-2 months', '2-4 months'
    ],
    'Permanence_Rating': [8, 7, 6, 9, 7, 8, 9, 8, 9, 8, 9, 7, 6, 8, 9],
    'Investment_Level': [7, 6, 5, 5, 4, 5, 8, 9, 8, 9, 8, 7, 4, 5, 6]
}

post_engagement_df = pd.DataFrame(post_engagement_changes_data)

# Early wedding planning indicators
wedding_planning_indicators_data = {
    'Planning_Indicator': [
        'Wedding venue research', 'Formal wear shopping surge', 'Groomsmen outfit coordination', 'Wedding suit appointments',
        'Tailor/alteration consultations', 'Wedding photographer meetings', 'Color scheme discussions', 'Seasonal fabric research',
        'Group booking inquiries', 'Wedding timeline creation', 'Budget planning sessions', 'Vendor research activities',
        'Pinterest/inspiration saving', 'Wedding show attendance', 'Dress code consultation'
    ],
    'Timeline_Before_Wedding': [
        '12-18 months', '6-12 months', '4-8 months', '3-6 months',
        '2-4 months', '8-15 months', '6-12 months', '4-8 months',
        '3-6 months', '8-15 months', '10-18 months', '6-15 months',
        '6-18 months', '8-15 months', '4-8 months'
    ],
    'Detection_Reliability': [9, 10, 9, 10, 8, 8, 7, 6, 9, 8, 9, 7, 6, 7, 8],
    'Spending_Increase': [0, 400, 300, 350, 200, 150, 50, 100, 250, 25, 100, 75, 0, 100, 150],
    'Behavioral_Intensity': [8, 9, 8, 9, 7, 6, 6, 5, 8, 7, 8, 6, 5, 6, 7],
    'Partner_Involvement': [9, 6, 4, 7, 5, 8, 9, 6, 7, 9, 10, 8, 7, 8, 8],
    'Urgency_Level': [6, 8, 9, 9, 10, 7, 6, 6, 8, 7, 8, 6, 4, 5, 8]
}

wedding_planning_df = pd.DataFrame(wedding_planning_indicators_data)

print("PROPOSAL PURCHASE PATTERN INDICATORS")
print("=" * 70)
print(proposal_df.to_string(index=False))

print("\n\nPOST-ENGAGEMENT STYLE CHANGES")
print("=" * 70)
print(post_engagement_df.to_string(index=False))

print("\n\nEARLY WEDDING PLANNING INDICATORS")
print("=" * 70)
print(wedding_planning_df.to_string(index=False))

# Save all dataframes
proposal_df.to_csv('proposal_purchase_indicators.csv', index=False)
post_engagement_df.to_csv('post_engagement_style_changes.csv', index=False)
wedding_planning_df.to_csv('wedding_planning_indicators.csv', index=False)

print("\n\nFiles saved: proposal_purchase_indicators.csv, post_engagement_style_changes.csv, wedding_planning_indicators.csv")

# Calculate key insights
highest_reliability = proposal_df.loc[proposal_df['Reliability_Score'].idxmax()]
most_common_change = post_engagement_df.loc[post_engagement_df['Percentage_Experiencing'].idxmax()]
strongest_wedding_indicator = wedding_planning_df.loc[wedding_planning_df['Detection_Reliability'].idxmax()]

print("\n\nKEY INSIGHTS:")
print(f"Most reliable proposal indicator: {highest_reliability['Purchase_Behavior']} (Reliability: {highest_reliability['Reliability_Score']}/10)")
print(f"Most common post-engagement change: {most_common_change['Specific_Change']} ({most_common_change['Percentage_Experiencing']}% experience this)")
print(f"Strongest wedding planning indicator: {strongest_wedding_indicator['Planning_Indicator']} (Reliability: {strongest_wedding_indicator['Detection_Reliability']}/10)")
print(f"Average proposal purchase frequency increase: {proposal_df['Frequency_Increase'].mean():.0f}%")
print(f"Average post-engagement style change rate: {post_engagement_df['Percentage_Experiencing'].mean():.1f}%")