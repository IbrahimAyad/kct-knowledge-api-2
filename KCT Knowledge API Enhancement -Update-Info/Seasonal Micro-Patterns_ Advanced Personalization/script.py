# Create comprehensive data about seasonal micro-patterns in menswear
import pandas as pd

# Unseasonable weather impact data
weather_impact_data = {
    'Weather_Pattern': [
        'Unexpected Cold Snap', 'Unseasonable Warm Spell', 'Extended Rainy Period', 
        'Early Heat Wave', 'Late Season Chill', 'Drought Conditions',
        'Sudden Storm Systems', 'Temperature Fluctuations'
    ],
    'Purchase_Spike_Percentage': [85, 120, 65, 95, 70, 45, 55, 80],
    'Affected_Categories': [
        'Outerwear, Wool Suits', 'Lightweight Fabrics, Linen', 'Rainwear, Water-resistant',
        'Summer Suits, Breathable', 'Transitional Pieces', 'Wrinkle-resistant',
        'Versatile Layers', 'Adaptable Fabrics'
    ],
    'Lead_Time_Days': [3, 5, 7, 2, 4, 14, 1, 2],
    'Inventory_Impact_Score': [9, 8, 6, 9, 7, 5, 8, 8],  # Scale 1-10
    'Regional_Variation': [8, 9, 7, 9, 8, 6, 9, 8]  # Scale 1-10
}

weather_df = pd.DataFrame(weather_impact_data)

print("Unseasonable Weather Purchase Impact Data")
print("="*50)
print(weather_df.to_string(index=False))

# Graduation season timing data
graduation_timing_data = {
    'Month': ['March', 'April', 'May', 'June', 'July', 'August'],
    'Graduation_Volume_Percentage': [5, 15, 45, 30, 3, 2],
    'Peak_Purchase_Window_Days': [21, 28, 35, 42, 14, 14],
    'Average_Spend_Per_Customer': [850, 1200, 1500, 1300, 600, 500],
    'Inventory_Turnover_Rate': [2.1, 3.5, 5.8, 4.2, 1.8, 1.5],
    'Size_Range_Demand': [
        'Slim/Modern Fit', 'Classic/Slim Fit', 'All Sizes Peak', 
        'Classic/Regular', 'Slim/Athletic', 'Basic Sizes'
    ],
    'Color_Preference_Trend': [
        'Navy, Charcoal', 'Navy, Gray, Black', 'Navy, Charcoal, Light Gray',
        'Navy, Light Colors', 'Dark Colors', 'Basic Navy'
    ]
}

graduation_df = pd.DataFrame(graduation_timing_data)

print("\n\nGraduation Season Inventory Timing Data")
print("="*45)
print(graduation_df.to_string(index=False))

# Holiday vs Wedding trends comparison
event_comparison_data = {
    'Trend_Category': [
        'Color Preferences', 'Fabric Choices', 'Accessories', 'Formality Level',
        'Seasonal Timing', 'Price Sensitivity', 'Style Innovation', 'Group Coordination'
    ],
    'Holiday_Party_Trend': [
        'Bold, Festive Colors', 'Velvet, Textured', 'Statement Pieces', 'Semi-Formal+',
        'Dec-Jan Peak', 'Moderate', 'High Creativity', 'Individual Expression'
    ],
    'Wedding_Trend': [
        'Classic, Neutral', 'Traditional Wools', 'Conservative', 'Formal Standard',
        'Year-Round', 'High Investment', 'Timeless Focus', 'Guest Coordination'
    ],
    'Difference_Score': [8, 6, 9, 4, 7, 6, 9, 8],  # Scale 1-10, higher = more different
    'Seasonality_Impact': [9, 7, 8, 3, 10, 5, 6, 4],  # Scale 1-10
    'Purchase_Urgency': [7, 5, 8, 6, 9, 4, 7, 5]  # Scale 1-10
}

comparison_df = pd.DataFrame(event_comparison_data)

print("\n\nHoliday Party vs Wedding Trends Comparison")
print("="*45)
print(comparison_df.to_string(index=False))

# Seasonal micro-patterns by month
monthly_patterns_data = {
    'Month': [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ],
    'Primary_Events': [
        'New Year, Returns', 'Valentines, Presidents Day', 'Spring Prep',
        'Easter, Spring Formal', 'Graduation Peak', 'Wedding Season',
        'Summer Events', 'Back-to-School', 'Fall Transition', 'Homecoming',
        'Black Friday, Thanksgiving', 'Holiday Parties'
    ],
    'Weather_Sensitivity': [6, 7, 9, 8, 7, 6, 8, 7, 9, 8, 7, 6],  # Scale 1-10
    'Inventory_Priority': [
        'Clearance, Basics', 'Spring Preview', 'Lightweight', 'Versatile',
        'Formal, Grad', 'Wedding, Summer', 'Breathable', 'Transitional',
        'Fall Prep', 'Layering', 'Holiday Prep', 'Festive, Formal'
    ],
    'Purchase_Urgency_Score': [4, 5, 7, 8, 9, 8, 6, 7, 8, 7, 8, 9]  # Scale 1-10
}

monthly_df = pd.DataFrame(monthly_patterns_data)

print("\n\nMonthly Seasonal Micro-Patterns")
print("="*35)
print(monthly_df.to_string(index=False))

# Save all data to CSV files
weather_df.to_csv('unseasonable_weather_impact.csv', index=False)
graduation_df.to_csv('graduation_season_timing.csv', index=False)
comparison_df.to_csv('holiday_vs_wedding_trends.csv', index=False)
monthly_df.to_csv('monthly_seasonal_patterns.csv', index=False)

print("\n\nAll data saved to CSV files:")
print("- unseasonable_weather_impact.csv")
print("- graduation_season_timing.csv")
print("- holiday_vs_wedding_trends.csv")
print("- monthly_seasonal_patterns.csv")

# Calculate key insights
print("\n\nKey Insights:")
print("="*20)
print(f"Highest weather impact: {weather_df.loc[weather_df['Purchase_Spike_Percentage'].idxmax(), 'Weather_Pattern']} (+{weather_df['Purchase_Spike_Percentage'].max()}%)")
print(f"Peak graduation month: {graduation_df.loc[graduation_df['Graduation_Volume_Percentage'].idxmax(), 'Month']} ({graduation_df['Graduation_Volume_Percentage'].max()}% of annual volume)")
print(f"Biggest holiday vs wedding difference: {comparison_df.loc[comparison_df['Difference_Score'].idxmax(), 'Trend_Category']}")
print(f"Most weather-sensitive month: {monthly_df.loc[monthly_df['Weather_Sensitivity'].idxmax(), 'Month']}")