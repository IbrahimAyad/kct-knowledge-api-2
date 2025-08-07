import pandas as pd

# Create a comprehensive analysis of price sensitivity in menswear formalwear
price_data = {
    'Price_Range': ['$100-200', '$200-350', '$350-500', '$500-1000', '$1000-2000', '$2000+'],
    'Customer_Behavior': [
        'Highly price sensitive, heavy comparison shopping, entry-level buyers',
        'Value shoppers, moderate comparison shopping, quality-conscious',
        'Quality-focused, selective comparison shopping, brand-aware',
        'Premium buyers, limited comparison shopping, feature-driven',
        'Luxury buyers, minimal price comparison, prestige-focused',
        'Ultra-luxury, status-driven, brand loyalty dominates'
    ],
    'Comparison_Shopping_Intensity': ['Very High', 'High', 'Moderate', 'Low', 'Very Low', 'Minimal'],
    'Bundle_Effectiveness': ['Low-Moderate', 'High', 'High', 'Moderate', 'Low', 'Very Low'],
    'Key_Motivators': [
        'Price, basic quality, occasion-driven',
        'Value for money, versatility, brand reputation',
        'Quality, fit, professional image',
        'Craftsmanship, exclusivity, prestige',
        'Luxury materials, bespoke features, status',
        'Heritage brands, ultimate exclusivity'
    ]
}

df = pd.DataFrame(price_data)
print("Menswear Formalwear Price Sensitivity Analysis")
print("=" * 60)
print(df.to_string(index=False))

# Create bundle strategy effectiveness data
bundle_data = {
    'Bundle_Type': [
        'Mix-and-Match Flexibility',
        'Complementary Accessories',
        'Seasonal/Event Bundles',
        'Premium Experience Bundles',
        'Clearance/Inventory Bundles'
    ],
    'Revenue_Impact': ['High Positive', 'Moderate Positive', 'High Positive', 'Moderate Positive', 'Mixed'],
    'Cannibalization_Risk': ['Low', 'Low', 'Low', 'Moderate', 'High'],
    'Best_Price_Range': ['$200-500', '$200-1000', '$200-500', '$500-2000', '$100-350'],
    'Strategy_Notes': [
        'Increases AOV without deep discounting core items',
        'Moves slow inventory, adds perceived value',
        'Creates urgency, captures occasion-based demand',
        'Enhances luxury positioning, justifies premium',
        'Risk of training customers to wait for deals'
    ]
}

bundle_df = pd.DataFrame(bundle_data)
print("\n\nBundle Strategy Effectiveness Analysis")
print("=" * 60)
print(bundle_df.to_string(index=False))

# Save to CSV files
df.to_csv('menswear_price_sensitivity_analysis.csv', index=False)
bundle_df.to_csv('bundle_strategy_effectiveness.csv', index=False)

print("\n\nFiles saved: menswear_price_sensitivity_analysis.csv and bundle_strategy_effectiveness.csv")