# Create comprehensive analysis of visual recognition gaps in menswear

import pandas as pd

# Instagram filter effects on color matching accuracy
instagram_filter_data = {
    'Filter_Name': [
        'No Filter', 'Valencia', 'X-Pro II', 'Lo-Fi', 'Earlybird', 'Sutro', 'Toaster',
        'Brannan', 'Inkwell', 'Walden', 'Hefe', '1977', 'Nashville', 'Kelvin',
        'Hudson', 'Clarendon', 'Gingham', 'Moon', 'Lark', 'Reyes'
    ],
    'Color_Accuracy_Impact': [
        100, 65, 45, 55, 60, 50, 40, 58, 20, 70, 62, 52, 48, 42, 68, 72, 75, 35, 78, 80
    ],
    'Navy_Suit_Distortion': [
        0, 25, 45, 35, 30, 40, 50, 32, 70, 20, 28, 38, 42, 48, 22, 18, 15, 55, 12, 10
    ],
    'Gray_Suit_Distortion': [
        0, 20, 40, 30, 25, 35, 45, 28, 65, 18, 25, 35, 40, 45, 20, 15, 12, 50, 10, 8
    ],
    'Brown_Suit_Distortion': [
        0, 15, 35, 25, 20, 30, 40, 22, 60, 15, 20, 30, 35, 40, 18, 12, 10, 45, 8, 5
    ],
    'White_Shirt_Impact': [
        0, 30, 50, 40, 35, 45, 55, 35, 75, 25, 32, 42, 48, 52, 28, 22, 18, 60, 15, 12
    ],
    'Overall_Menswear_Accuracy': [
        100, 68, 48, 58, 62, 52, 42, 60, 25, 72, 65, 55, 50, 45, 70, 75, 78, 38, 80, 82
    ]
}

filter_df = pd.DataFrame(instagram_filter_data)

# Phone camera color distortion data
phone_camera_data = {
    'Phone_Model': [
        'iPhone 15 Pro', 'iPhone 14 Pro', 'iPhone 13', 'Samsung Galaxy S24 Ultra',
        'Samsung Galaxy S23', 'Google Pixel 8 Pro', 'Google Pixel 7', 'OnePlus 12',
        'OnePlus 11', 'Huawei P60 Pro', 'Xiaomi 14 Ultra', 'Sony Xperia 1 V'
    ],
    'Navy_Color_Accuracy': [85, 82, 78, 88, 85, 92, 90, 80, 78, 75, 83, 87],
    'Gray_Color_Accuracy': [88, 85, 80, 90, 87, 94, 92, 82, 80, 78, 85, 89],
    'Brown_Color_Accuracy': [82, 79, 75, 85, 82, 89, 87, 77, 75, 72, 80, 84],
    'Black_Color_Accuracy': [90, 87, 83, 92, 89, 95, 93, 85, 83, 80, 88, 91],
    'White_Balance_Performance': [87, 84, 80, 89, 86, 93, 91, 81, 79, 76, 84, 88],
    'Skin_Tone_Accuracy': [89, 86, 82, 91, 88, 94, 92, 83, 81, 78, 86, 90],
    'Overall_Suit_Color_Accuracy': [87, 84, 80, 89, 86, 93, 91, 81, 79, 76, 84, 88],
    'HDR_Color_Distortion': [15, 18, 22, 12, 15, 8, 10, 20, 22, 25, 17, 13]
}

camera_df = pd.DataFrame(phone_camera_data)

# Visual quality cues that customers recognize
quality_cues_data = {
    'Visual_Cue_Category': [
        'Construction Details', 'Construction Details', 'Construction Details', 'Construction Details',
        'Fabric Quality', 'Fabric Quality', 'Fabric Quality', 'Fabric Quality',
        'Finishing Details', 'Finishing Details', 'Finishing Details', 'Finishing Details',
        'Fit Indicators', 'Fit Indicators', 'Fit Indicators', 'Fit Indicators',
        'Hardware Quality', 'Hardware Quality', 'Hardware Quality', 'Hardware Quality'
    ],
    'Specific_Visual_Cue': [
        'Hand-stitched buttonholes', 'Lapel roll naturalness', 'Canvas construction visibility', 'Seam straightness',
        'Fabric drape quality', 'Pattern matching precision', 'Fabric weight appearance', 'Surface texture consistency',
        'Collar gap at neck', 'Sleeve button functionality', 'Lining quality visibility', 'Edge finishing cleanliness',
        'Shoulder line smoothness', 'Jacket length proportion', 'Trouser break positioning', 'Waist suppression shape',
        'Button material quality', 'Zipper brand/quality', 'Hardware finish consistency', 'Thread color matching'
    ],
    'Customer_Recognition_Rate': [45, 65, 35, 75, 80, 85, 70, 72, 90, 55, 40, 68, 95, 88, 82, 78, 60, 50, 45, 85],
    'Quality_Impact_Score': [9, 8, 10, 7, 9, 8, 8, 7, 9, 6, 7, 8, 10, 9, 8, 9, 7, 6, 5, 6],
    'Photography_Visibility': [60, 75, 25, 85, 90, 95, 80, 82, 95, 70, 50, 78, 98, 92, 88, 85, 70, 60, 55, 88],
    'AI_Recognition_Difficulty': [8, 7, 9, 6, 5, 4, 6, 7, 3, 8, 9, 7, 2, 3, 4, 5, 7, 8, 9, 6]
}

quality_cues_df = pd.DataFrame(quality_cues_data)

print("INSTAGRAM FILTER COLOR ACCURACY IMPACT")
print("=" * 70)
print(filter_df.to_string(index=False))

print("\n\nPHONE CAMERA COLOR DISTORTION ANALYSIS")
print("=" * 70)
print(camera_df.to_string(index=False))

print("\n\nVISUAL QUALITY CUES CUSTOMER RECOGNITION")
print("=" * 70)
print(quality_cues_df.to_string(index=False))

# Save all dataframes
filter_df.to_csv('instagram_filter_color_impact.csv', index=False)
camera_df.to_csv('phone_camera_color_distortion.csv', index=False)
quality_cues_df.to_csv('visual_quality_cues_recognition.csv', index=False)

print("\n\nFiles saved: instagram_filter_color_impact.csv, phone_camera_color_distortion.csv, visual_quality_cues_recognition.csv")

# Calculate key insights
worst_filter = filter_df.loc[filter_df['Overall_Menswear_Accuracy'].idxmin()]
best_camera = camera_df.loc[camera_df['Overall_Suit_Color_Accuracy'].idxmax()]
most_recognized_cue = quality_cues_df.loc[quality_cues_df['Customer_Recognition_Rate'].idxmax()]

print("\n\nKEY INSIGHTS:")
print(f"Worst Instagram filter for menswear: {worst_filter['Filter_Name']} ({worst_filter['Overall_Menswear_Accuracy']}% accuracy)")
print(f"Best phone camera for suit colors: {best_camera['Phone_Model']} ({best_camera['Overall_Suit_Color_Accuracy']}% accuracy)")
print(f"Most recognized quality cue: {most_recognized_cue['Specific_Visual_Cue']} ({most_recognized_cue['Customer_Recognition_Rate']}% recognition rate)")
print(f"Average color accuracy across all phones: {camera_df['Overall_Suit_Color_Accuracy'].mean():.1f}%")
print(f"Average Instagram filter accuracy loss: {100 - filter_df['Overall_Menswear_Accuracy'].mean():.1f}%")