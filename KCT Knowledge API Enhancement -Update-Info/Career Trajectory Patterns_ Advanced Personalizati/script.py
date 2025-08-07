# Create comprehensive data about career trajectory patterns and wardrobe evolution
import pandas as pd

# Career stage wardrobe data
career_stage_data = {
    'Career_Stage': [
        'Entry Level (0-2 years)', 'Mid-Level (3-7 years)', 'Senior Manager (8-15 years)', 
        'Director (10-20 years)', 'VP/Executive (15+ years)', 'C-Suite (20+ years)'
    ],
    'Average_Wardrobe_Investment': [1500, 3000, 5000, 8000, 12000, 20000],
    'Suit_Quality_Level': [2, 3, 4, 5, 6, 7],  # Scale 1-7
    'Tailoring_Frequency': [1, 2, 3, 4, 5, 6],  # Times per year
    'Brand_Prestige_Focus': [30, 45, 60, 75, 85, 95],  # Percentage
    'Style_Formality_Score': [60, 70, 80, 85, 90, 95],  # Percentage formality
    'Accessory_Investment': [200, 500, 800, 1200, 2000, 3500]
}

career_df = pd.DataFrame(career_stage_data)

print("Career Stage Wardrobe Evolution Data")
print("="*50)
print(career_df.to_string(index=False))

# Promotion signals data
promotion_signals_data = {
    'Signal_Category': [
        'Wardrobe Upgrade', 'Meeting Attendance', 'Travel Increase', 
        'Networking Events', 'Formal Training', 'Responsibility Expansion',
        'Salary Negotiation', 'Office Space Change'
    ],
    'Timing_Before_Promotion_Months': [3, 6, 4, 2, 8, 12, 1, 2],
    'Reliability_Score': [85, 90, 75, 80, 70, 95, 60, 85],  # How reliable this signal is
    'Investment_Required': [2000, 0, 500, 800, 3000, 0, 0, 0],  # Average cost
    'ROI_Multiplier': [3.5, 0, 2.0, 4.0, 5.0, 0, 8.0, 0]  # Return on investment
}

signals_df = pd.DataFrame(promotion_signals_data)

print("\n\nPromotion Signals and Timing Data")
print("="*40)
print(signals_df.to_string(index=False))

# Wardrobe upgrade timing patterns
upgrade_timing_data = {
    'Upgrade_Trigger': [
        'Job Interview Scheduled', 'New Role Confirmation', 'Salary Increase',
        'Industry Conference', 'Board Meeting Presentation', 'Client Pitch',
        'Performance Review Season', 'New Year/Quarter'
    ],
    'Urgency_Level': [9, 8, 6, 7, 9, 8, 5, 4],  # Scale 1-10
    'Typical_Spend': [1500, 3000, 2000, 800, 1200, 1000, 500, 800],
    'Success_Impact': [85, 90, 70, 75, 95, 80, 60, 50],  # Percentage impact on success
    'Planning_Window_Days': [14, 30, 60, 21, 7, 14, 90, 45]
}

timing_df = pd.DataFrame(upgrade_timing_data)

print("\n\nWardrobe Upgrade Timing Patterns")
print("="*40)
print(timing_df.to_string(index=False))

# Age and career progression patterns
age_progression_data = {
    'Age_Range': [
        '22-27', '28-32', '33-37', '38-42', '43-47', '48-52', '53-57', '58+'
    ],
    'Typical_Role_Level': [
        'Analyst/Associate', 'Senior Analyst', 'Manager', 'Senior Manager', 
        'Director', 'VP', 'SVP', 'C-Suite'
    ],
    'Wardrobe_Budget_Percentage': [5, 6, 7, 8, 9, 10, 11, 12],  # % of income
    'Style_Confidence_Score': [60, 70, 75, 80, 85, 90, 92, 95],
    'Brand_Loyalty': [40, 50, 60, 70, 80, 85, 90, 95],  # Percentage
    'Custom_Tailoring_Usage': [10, 25, 40, 60, 75, 85, 90, 95]  # Percentage
}

age_df = pd.DataFrame(age_progression_data)

print("\n\nAge and Career Progression Patterns")
print("="*40)
print(age_df.to_string(index=False))

# Save all data to CSV files
career_df.to_csv('career_stage_wardrobe.csv', index=False)
signals_df.to_csv('promotion_signals.csv', index=False)
timing_df.to_csv('wardrobe_upgrade_timing.csv', index=False)
age_df.to_csv('age_career_progression.csv', index=False)

print("\n\nAll data saved to CSV files:")
print("- career_stage_wardrobe.csv")
print("- promotion_signals.csv") 
print("- wardrobe_upgrade_timing.csv")
print("- age_career_progression.csv")

# Calculate some key insights
print("\n\nKey Insights:")
print("="*20)
print(f"Average wardrobe investment increase from entry to C-suite: {(career_df['Average_Wardrobe_Investment'].max() / career_df['Average_Wardrobe_Investment'].min()):.1f}x")
print(f"Most reliable promotion signal: {signals_df.loc[signals_df['Reliability_Score'].idxmax(), 'Signal_Category']}")
print(f"Highest ROI upgrade trigger: {timing_df.loc[timing_df['Success_Impact'].idxmax(), 'Upgrade_Trigger']}")
print(f"Peak wardrobe investment age: {age_df.loc[age_df['Wardrobe_Budget_Percentage'].idxmax(), 'Age_Range']}")