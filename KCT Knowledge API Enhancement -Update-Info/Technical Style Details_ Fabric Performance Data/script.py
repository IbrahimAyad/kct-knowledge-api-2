# Create comprehensive data analysis for fabric performance and photography characteristics

import pandas as pd

# Fabric Performance Data in Real-World Conditions
fabric_performance_data = {
    'Fabric_Type': [
        'Worsted Wool (100%)', 'Wool Flannel', 'Tropical Wool', 'Super 120s Wool', 'Super 150s Wool',
        'Cotton Twill', 'Cotton Poplin', 'Linen (100%)', 'Linen-Cotton Blend',
        'Polyester (100%)', 'Wool-Polyester Blend', 'Wool-Silk Blend',
        'Cashmere', 'Merino Wool'
    ],
    'Durability_Rating': [9, 8, 7, 8, 6, 7, 6, 5, 6, 8, 7, 7, 6, 7],
    'Wrinkle_Resistance': [8, 7, 8, 7, 5, 4, 3, 2, 4, 9, 8, 6, 5, 7],
    'Breathability': [8, 6, 9, 7, 8, 9, 9, 10, 9, 3, 6, 7, 8, 9],
    'Shape_Retention': [9, 8, 8, 7, 6, 6, 5, 4, 5, 8, 7, 6, 5, 7],
    'Moisture_Management': [7, 6, 8, 7, 7, 8, 8, 9, 8, 2, 5, 6, 6, 8],
    'Professional_Lifespan_Years': [10, 12, 8, 8, 5, 6, 4, 3, 5, 8, 7, 6, 4, 6],
    'Care_Difficulty': [7, 8, 6, 7, 9, 4, 3, 6, 5, 2, 5, 8, 9, 7],
    'Cost_Per_Yard_Range': ['$80-150', '$60-120', '$90-180', '$100-200', '$150-350', 
                           '$15-40', '$12-30', '$25-80', '$20-60',
                           '$8-25', '$30-80', '$120-300', '$200-500', '$80-200']
}

fabric_df = pd.DataFrame(fabric_performance_data)

# Suit Construction Lifespan Data
construction_data = {
    'Construction_Type': ['Full Canvas', 'Half Canvas', 'Fused (High Quality)', 'Fused (Budget)', 'Unstructured'],
    'Expected_Lifespan_Years': [20, 15, 8, 3, 5],
    'Shape_Retention_Over_Time': [9, 8, 5, 2, 3],
    'Breathability_Rating': [10, 8, 4, 3, 7],
    'Alteration_Capability': [9, 8, 6, 3, 5],
    'Cost_Premium_Factor': [3.0, 2.0, 1.2, 1.0, 1.1],
    'Dry_Cleaning_Durability': [10, 9, 6, 3, 7],
    'Professional_Wear_Suitability': [10, 9, 7, 4, 6]
}

construction_df = pd.DataFrame(construction_data)

# Photography Performance by Fabric and Skin Tone
photo_data = {
    'Fabric_Type': [
        'Navy Wool', 'Charcoal Wool', 'Black Wool', 'Light Gray Wool', 'Brown Wool',
        'Navy Cotton', 'White Cotton', 'Cream Cotton', 'Light Blue Cotton',
        'Dark Linen', 'Light Linen', 'Beige Linen',
        'Silk Blend', 'Polyester'
    ],
    'Fair_Skin_Rating': [9, 8, 7, 6, 8, 8, 5, 7, 9, 8, 6, 7, 8, 7],
    'Medium_Skin_Rating': [9, 9, 8, 7, 9, 8, 8, 8, 8, 9, 8, 9, 9, 7],
    'Dark_Skin_Rating': [8, 7, 6, 9, 7, 7, 10, 9, 8, 7, 9, 8, 8, 6],
    'Olive_Skin_Rating': [9, 8, 7, 7, 9, 8, 7, 8, 7, 8, 7, 8, 9, 7],
    'Camera_Flash_Performance': [8, 9, 6, 7, 8, 7, 4, 6, 7, 7, 5, 6, 5, 3],
    'Natural_Light_Performance': [9, 8, 8, 8, 9, 9, 8, 9, 9, 9, 9, 9, 8, 7],
    'Studio_Light_Performance': [8, 9, 7, 8, 8, 8, 6, 7, 8, 8, 7, 8, 6, 4],
    'Color_Accuracy_Retention': [9, 9, 8, 8, 8, 8, 7, 8, 8, 7, 7, 8, 7, 5]
}

photo_df = pd.DataFrame(photo_data)

print("FABRIC PERFORMANCE IN REAL-WORLD CONDITIONS")
print("=" * 70)
print(fabric_df.to_string(index=False))

print("\n\nSUIT CONSTRUCTION LIFESPAN ANALYSIS")
print("=" * 70)
print(construction_df.to_string(index=False))

print("\n\nFABRIC PHOTOGRAPHY PERFORMANCE BY SKIN TONE")
print("=" * 70)
print(photo_df.to_string(index=False))

# Save all dataframes
fabric_df.to_csv('fabric_performance_real_world.csv', index=False)
construction_df.to_csv('suit_construction_lifespan.csv', index=False)
photo_df.to_csv('fabric_photography_performance.csv', index=False)

print("\n\nFiles saved: fabric_performance_real_world.csv, suit_construction_lifespan.csv, fabric_photography_performance.csv")

# Calculate some insights
print("\n\nKEY INSIGHTS:")
print(f"Highest durability fabric: {fabric_df.loc[fabric_df['Durability_Rating'].idxmax(), 'Fabric_Type']} (Rating: {fabric_df['Durability_Rating'].max()})")
print(f"Longest lasting construction: {construction_df.loc[construction_df['Expected_Lifespan_Years'].idxmax(), 'Construction_Type']} ({construction_df['Expected_Lifespan_Years'].max()} years)")
print(f"Best overall photography fabric for fair skin: {photo_df.loc[photo_df['Fair_Skin_Rating'].idxmax(), 'Fabric_Type']} (Rating: {photo_df['Fair_Skin_Rating'].max()})")
print(f"Best overall photography fabric for dark skin: {photo_df.loc[photo_df['Dark_Skin_Rating'].idxmax(), 'Fabric_Type']} (Rating: {photo_df['Dark_Skin_Rating'].max()})")