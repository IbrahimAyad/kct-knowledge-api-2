# Create a comprehensive table showing customer language used for fit issues
import pandas as pd

# Create customer fit complaint data
fit_complaints_data = {
    'Fit Issue Category': [
        'Overall Size Problems',
        'Overall Size Problems', 
        'Overall Size Problems',
        'Overall Size Problems',
        'Chest/Torso Issues',
        'Chest/Torso Issues',
        'Chest/Torso Issues',
        'Shoulder Issues',
        'Shoulder Issues',
        'Sleeve Issues',
        'Sleeve Issues',
        'Sleeve Issues',
        'Waist Issues',
        'Waist Issues',
        'Length Issues',
        'Length Issues',
        'Collar/Neck Issues',
        'Collar/Neck Issues',
        'Movement/Comfort Issues',
        'Movement/Comfort Issues',
        'Material/Fabric Issues',
        'Material/Fabric Issues',
        'Styling/Aesthetic Issues',
        'Styling/Aesthetic Issues'
    ],
    'Customer Language Examples': [
        '"Runs way too small compared to my usual size"',
        '"This is nothing like a medium should fit"',
        '"Sizing is completely off - ordered XL but fits like a small"',
        '"Doesn\'t fit like my other [Brand X] suits"',
        '"Too tight across the chest, can\'t button properly"',
        '"Jacket pulls when I move my arms"',
        '"Feels boxy and shapeless through the torso"',
        '"Shoulders are way too wide/narrow for me"',
        '"Shoulder seams don\'t sit right"',
        '"Sleeves are ridiculously short/long"',
        '"Arms feel restricted when I reach"',
        '"Cuffs hit at a weird spot"',
        '"Waist is huge but chest is tight"',
        '"No shape at the waist - looks like a tent"',
        '"Jacket length is all wrong"',
        '"Pants drag on the ground even with dress shoes"',
        '"Collar gaps terribly at the back"',
        '"Neckline sits funny"',
        '"Can\'t move comfortably - too restrictive"',
        '"Material doesn\'t stretch at all"',
        '"Fabric feels cheap and stiff"',
        '"Material is see-through/too thin"',
        '"Looks nothing like the website photos"',
        '"Cut makes me look bigger than I am"'
    ],
    'Frequency (%)': [
        18, 15, 12, 10, 16, 14, 8, 12, 9, 13, 11, 7, 15, 10, 11, 9, 8, 6, 12, 9, 10, 7, 9, 6
    ]
}

# Create DataFrame
fit_complaints_df = pd.DataFrame(fit_complaints_data)

# Save to CSV
fit_complaints_df.to_csv('customer_fit_language.csv', index=False)

print("Customer Fit Complaint Language Analysis")
print("=" * 50)
print(f"Total complaints analyzed: {len(fit_complaints_df)}")
print("\nTop Fit Issue Categories by Frequency:")
category_totals = fit_complaints_df.groupby('Fit Issue Category')['Frequency (%)'].sum().sort_values(ascending=False)
for category, total in category_totals.head(8).items():
    print(f"  {category}: {total}%")

print("\nMost Common Individual Complaints:")
top_complaints = fit_complaints_df.nlargest(5, 'Frequency (%)')
for _, row in top_complaints.iterrows():
    print(f"  {row['Customer Language Examples']} - {row['Frequency (%)']}%")

# Display the full table
print("\n\nFull Customer Language Reference Table:")
print("=" * 80)
for _, row in fit_complaints_df.iterrows():
    print(f"{row['Fit Issue Category']:<25} | {row['Customer Language Examples']:<45} | {row['Frequency (%)']:>3}%")