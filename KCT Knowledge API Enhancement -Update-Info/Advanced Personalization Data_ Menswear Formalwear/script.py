import pandas as pd

# Create comprehensive data about how hobbies influence menswear style choices
hobby_influence_data = {
    'Hobby_Category': [
        'Sports/Fitness', 'Music/Arts', 'Technology', 'Outdoor Activities', 
        'Professional Networking', 'Gaming', 'Travel', 'Collecting'
    ],
    'Style_Influence_Score': [85, 78, 65, 82, 90, 45, 75, 68],
    'Color_Preference_Impact': [70, 85, 60, 80, 65, 40, 75, 72],
    'Fabric_Choice_Impact': [80, 65, 55, 85, 70, 35, 70, 60],
    'Fit_Preference_Impact': [90, 60, 50, 75, 80, 30, 65, 55],
    'Accessory_Integration': [75, 90, 70, 80, 85, 25, 80, 85],
    'Brand_Alignment': [85, 75, 80, 70, 95, 50, 70, 65]
}

df_hobbies = pd.DataFrame(hobby_influence_data)

print("Hobby Influence on Menswear Style Choices")
print("="*50)
print(df_hobbies.to_string(index=False))

# Save to CSV
df_hobbies.to_csv('hobby_style_influence.csv', index=False)
print("\nData saved to hobby_style_influence.csv")

# Calculate summary statistics
print("\nSummary Statistics:")
print("="*25)
print(f"Highest overall style influence: {df_hobbies['Style_Influence_Score'].max()}% ({df_hobbies.loc[df_hobbies['Style_Influence_Score'].idxmax(), 'Hobby_Category']})")
print(f"Lowest overall style influence: {df_hobbies['Style_Influence_Score'].min()}% ({df_hobbies.loc[df_hobbies['Style_Influence_Score'].idxmin(), 'Hobby_Category']})")
print(f"Average style influence: {df_hobbies['Style_Influence_Score'].mean():.1f}%")

# Create insights about lifestyle habits
lifestyle_insights = {
    'Lifestyle_Factor': [
        'Daily Commute Type', 'Exercise Frequency', 'Social Activities', 
        'Work Environment', 'Climate/Location', 'Age Group', 
        'Income Level', 'Personal Values'
    ],
    'Impact_on_Fabric_Choice': [85, 75, 60, 80, 90, 65, 70, 85],
    'Impact_on_Fit_Preference': [70, 90, 55, 75, 60, 80, 85, 70],
    'Impact_on_Style_Direction': [60, 65, 85, 70, 75, 90, 80, 95],
    'Personalization_Opportunity': [90, 85, 75, 80, 85, 70, 75, 90]
}

df_lifestyle = pd.DataFrame(lifestyle_insights)

print("\n\nLifestyle Factors Impact on Menswear Choices")
print("="*50)
print(df_lifestyle.to_string(index=False))

# Save lifestyle data
df_lifestyle.to_csv('lifestyle_menswear_impact.csv', index=False)
print("\nLifestyle data saved to lifestyle_menswear_impact.csv")